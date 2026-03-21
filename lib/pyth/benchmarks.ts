/**
 * Pyth Benchmarks — Historical price data
 * Public API, FREE, no authentication required
 * Rate limit: 30 requests / 10 seconds
 *
 * This is what powers the Oracle CI Calibration Analysis —
 * the flagship "Most Creative Pyth Pro Use" feature.
 */

const BENCHMARKS_URL =
  process.env.NEXT_PUBLIC_BENCHMARKS_URL ?? "https://benchmarks.pyth.network";

// Hermes also supports historical price queries at the same path as live feeds.
// We prefer Hermes because it requires no API key and we know it works.
// Benchmarks is kept as fallback for when PYTH_PRO_API_KEY is available.
const HERMES_URL = "https://hermes.pyth.network";

// Optional Pyth Pro API key — enables Benchmarks fallback if Hermes historical fails.
const PYTH_PRO_API_KEY = process.env.PYTH_PRO_API_KEY ?? "";

function benchmarksHeaders(): HeadersInit {
  return PYTH_PRO_API_KEY
    ? { Authorization: `Bearer ${PYTH_PRO_API_KEY}` }
    : {};
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface PriceSnapshot {
  timestamp: number;
  price: number;       // in price units (expo already applied)
  conf: number;        // CI half-width in price units
  expo: number;
  publishSlot?: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CalibrationPoint {
  k: number;           // sigma multiple: 0.5, 1, 1.5, 2, 2.5, 3
  expected: number;    // theoretically correct capture rate (normal dist)
  observed: number;    // what we measured from Pyth Benchmarks data
  sampleSize: number;
}

export interface CalibrationResult {
  symbol: string;
  points: CalibrationPoint[];
  healthScore: number; // 0–100: how well calibrated overall
  verdict: "excellent" | "good" | "fair" | "poor";
  samplePeriodDays: number;
}

// ── Fetch historical candles (OHLCV) ────────────────────────────────────────

export async function getHistoricalCandles(
  symbol: string,          // e.g. "Crypto.BTC/USD"
  resolution: "1" | "5" | "15" | "60" | "D",
  fromTimestamp: number,
  toTimestamp: number
): Promise<Candle[]> {
  const url =
    `${BENCHMARKS_URL}/v1/shims/tradingview/history` +
    `?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}` +
    `&from=${fromTimestamp}&to=${toTimestamp}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Benchmarks candles error: ${res.status}`);

  const data = await res.json();

  // TradingView format: { t: timestamps[], o: open[], h: high[], l: low[], c: close[] }
  if (!data.t || data.s === "no_data") return [];

  return data.t.map((time: number, i: number) => ({
    time,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
  }));
}

// ── Fetch price snapshots for calibration analysis ───────────────────────────

export async function getPriceSnapshots(
  priceId: string,
  fromTimestamp: number,
  toTimestamp: number,
  intervalMinutes: number = 5
): Promise<PriceSnapshot[]> {
  const snapshots: PriceSnapshot[] = [];
  const step = intervalMinutes * 60;

  // Build timestamp list
  const timestamps: number[] = [];
  for (let t = fromTimestamp; t <= toTimestamp; t += step) {
    timestamps.push(t);
  }

  // ── Rate-limit-aware batching ──────────────────────────────────────────────
  // Strategy: try Hermes first (no auth needed, same API we use for live feeds).
  // Hermes supports /v2/updates/price/{publish_time} for historical queries.
  // If Hermes fails consistently, fall back to Benchmarks (requires PYTH_PRO_API_KEY).
  const BATCH_SIZE    = 5;
  const BATCH_DELAY   = 1500; // ms between batches — Hermes is more lenient

  let hermesErrors = 0;
  let firstErrorStatus: number | null = null;

  async function fetchSnapshot(ts: number): Promise<unknown> {
    // 1️⃣ Try Hermes historical endpoint (no auth required)
    const hermesUrl = `${HERMES_URL}/v2/updates/price/${ts}?ids[]=${priceId}&parsed=true`;
    const hr = await fetch(hermesUrl, { cache: "no-store" });
    if (hr.ok) return hr.json();
    hermesErrors++;
    if (!firstErrorStatus) firstErrorStatus = hr.status;

    // 2️⃣ Fall back to Benchmarks if we have a Pro API key
    if (PYTH_PRO_API_KEY) {
      const br = await fetch(
        `${BENCHMARKS_URL}/v1/updates/price/${ts}?ids[]=${priceId}&parsed=true`,
        { cache: "no-store", headers: benchmarksHeaders() }
      );
      if (br.ok) return br.json();
      if (!firstErrorStatus) firstErrorStatus = br.status;
    }

    return null;
  }

  for (let i = 0; i < timestamps.length; i += BATCH_SIZE) {
    const batch = timestamps.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(batch.map(fetchSnapshot));

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        const data   = result.value as { parsed?: Array<{ price: { expo: number; price: string; conf: string; publish_time: number } }> };
        const parsed = data?.parsed?.[0];
        if (parsed) {
          const expo  = parsed.price.expo;
          const scale = Math.pow(10, expo);
          snapshots.push({
            timestamp: parsed.price.publish_time,
            price:     Number(parsed.price.price) * scale,
            conf:      Number(parsed.price.conf)  * scale,
            expo,
          });
        }
      }
    }

    // Respect rate limit: wait between batches (skip after last batch)
    if (i + BATCH_SIZE < timestamps.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY));
    }
  }

  // Surface a helpful error if we got no data
  if (snapshots.length === 0 && firstErrorStatus) {
    const hint = `Historical price API returned HTTP ${firstErrorStatus} for all ${timestamps.length} requests. If this persists, add PYTH_PRO_API_KEY to .env.local.`;
    throw new Error(hint);
  }

  return snapshots.sort((a, b) => a.timestamp - b.timestamp);
}

// ── Core: CI Calibration Analysis ────────────────────────────────────────────

/**
 * The flagship feature of Pyth Insight.
 *
 * For each sigma multiple k, we check: what % of the time did the actual
 * price change (over `horizonSeconds`) fall within ±k×CI?
 *
 * A perfectly calibrated oracle should produce:
 *   ±0.5σ → 38.3% capture
 *   ±1.0σ → 68.3% capture
 *   ±1.5σ → 86.6% capture
 *   ±2.0σ → 95.4% capture
 *   ±2.5σ → 98.8% capture
 *   ±3.0σ → 99.7% capture
 *
 * Over-confident oracle → observed < expected (CI too narrow)
 * Under-confident oracle → observed > expected (CI too wide)
 */
export function computeCalibration(
  snapshots: PriceSnapshot[],
  horizonSeconds: number = 60
): CalibrationPoint[] {
  const SIGMA_MULTIPLES = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
  const EXPECTED        = [0.383, 0.683, 0.866, 0.954, 0.988, 0.997];

  return SIGMA_MULTIPLES.map((k, idx) => {
    let captured = 0;
    let total = 0;

    for (let i = 0; i < snapshots.length - 1; i++) {
      const snap = snapshots[i];
      // Find snapshot closest to snap.timestamp + horizonSeconds
      const targetTime = snap.timestamp + horizonSeconds;
      const future = findNearestSnapshot(snapshots, targetTime, i + 1);
      if (!future || Math.abs(future.timestamp - targetTime) > horizonSeconds * 0.5) continue;

      const actualMove = Math.abs(future.price - snap.price);
      const bound = k * snap.conf;

      if (actualMove <= bound) captured++;
      total++;
    }

    return {
      k,
      expected: EXPECTED[idx],
      observed: total > 0 ? captured / total : 0,
      sampleSize: total,
    };
  });
}

// ── Health Score ──────────────────────────────────────────────────────────────

export function computeHealthScore(points: CalibrationPoint[]): number {
  if (points.length === 0) return 0;

  // Sum of squared deviations from perfect calibration (weighted by sigma level)
  const weights = [1, 2, 2, 2, 1, 1]; // weight ±1σ and ±2σ most heavily
  let weightedSumSq = 0;
  let totalWeight = 0;

  points.forEach((p, i) => {
    const dev = Math.abs(p.observed - p.expected);
    weightedSumSq += weights[i] * dev * dev;
    totalWeight += weights[i];
  });

  const rmse = Math.sqrt(weightedSumSq / totalWeight);
  // rmse of 0 = perfect (score 100), rmse of 0.5+ = terrible (score 0)
  return Math.max(0, Math.round(100 * (1 - rmse / 0.3)));
}

export function getVerdict(score: number): CalibrationResult["verdict"] {
  if (score >= 85) return "excellent";
  if (score >= 65) return "good";
  if (score >= 45) return "fair";
  return "poor";
}

// ── Secondary analytics ───────────────────────────────────────────────────────

export function computeRealizedVolatility(candles: Candle[], windowDays: number = 7): number {
  const closes = candles.map((c) => c.close);
  if (closes.length < 2) return 0;

  const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
  const recent = returns.slice(-(windowDays * 24)); // assuming 1-hr candles
  if (recent.length === 0) return 0;

  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((s, r) => s + (r - mean) ** 2, 0) / recent.length;
  return Math.sqrt(variance * 8760) * 100; // annualized (8760 hrs/year)
}

export function computeCIWidthTrend(snapshots: PriceSnapshot[]): number {
  if (snapshots.length < 10) return 0;
  const widths = snapshots.map((s) => (s.conf / s.price) * 100);
  return linearRegressionSlope(
    snapshots.map((s) => s.timestamp),
    widths
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findNearestSnapshot(
  snapshots: PriceSnapshot[],
  targetTime: number,
  startIdx: number
): PriceSnapshot | null {
  let best: PriceSnapshot | null = null;
  let bestDiff = Infinity;

  for (let i = startIdx; i < snapshots.length; i++) {
    const diff = Math.abs(snapshots[i].timestamp - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = snapshots[i];
    }
    // Snapshots are sorted; once we pass the target, diff starts growing
    if (snapshots[i].timestamp > targetTime + 300) break;
  }

  return best;
}

function linearRegressionSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  return den === 0 ? 0 : num / den;
}
