/**
 * GET /api/volatility
 *
 * Returns 7-day realized volatility rankings for all tracked crypto assets.
 * Uses the Pyth Benchmarks TradingView shim — one request per asset for
 * 7 days of hourly OHLCV, then computes annualized RV from log returns.
 *
 * All requests fire in parallel (Promise.allSettled) and the TradingView
 * endpoint has a higher rate limit (90 req/10s vs 30 for the snapshot endpoint).
 *
 * Cached 10 minutes — historical vol doesn't change second-by-second.
 */

import { NextResponse }          from "next/server";
import { BENCHMARKS_SYMBOLS, PRICE_IDS } from "@/lib/pyth/price-ids";
import { getHistoricalCandles }  from "@/lib/pyth/benchmarks";
import { getHermesClient }       from "@/lib/pyth/hermes";

export const runtime     = "nodejs";
export const maxDuration = 30;

export type VolRegime = "low" | "medium" | "high" | "extreme";

export interface AssetVolatility {
  symbol:     string;
  rv7d:       number;     // 7-day annualized RV (%)
  rv24h:      number;     // 24-hour annualized RV (%)
  rvTrend:    number;     // rv24h - rv7d — positive means vol is rising
  regime:     VolRegime;
  closes:     number[];   // hourly close prices for sparkline
  dataPoints: number;     // number of candles used
  // CI / RV alignment — compares Pyth's live confidence interval against realized vol
  ciWidthPct: number;     // current live CI width as % of price (annualized)
  ciRvRatio:  number;     // ciWidthPct / rv7d — <1 means CI is tighter than realized vol (over-confident)
  ciAlignment: "tight" | "aligned" | "wide" | "unknown"; // human-readable verdict
}

function annualizedRV(closes: number[], windowHours: number): number {
  const slice = closes.slice(-windowHours);
  if (slice.length < 2) return 0;
  const returns = slice.slice(1).map((c, i) => Math.log(c / slice[i]));
  const mean    = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance * 8760) * 100; // annualised, in %
}

function classifyRegime(rv: number): VolRegime {
  if (rv < 40)  return "low";
  if (rv < 80)  return "medium";
  if (rv < 150) return "high";
  return "extreme";
}

// Fetch live CI widths via the shared HermesClient (10s timeout, 3 retries)
async function fetchLiveCIWidths(symbols: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  try {
    const priceIds: string[] = [];
    const idToSym: Record<string, string> = {};
    for (const sym of symbols) {
      const raw = PRICE_IDS[sym]?.replace(/^0x/, "");
      if (raw) { priceIds.push(raw); idToSym[raw] = sym; }
    }
    if (priceIds.length === 0) return result;

    const client = getHermesClient();
    const update = await client.getLatestPriceUpdates(priceIds, { parsed: true });

    for (const entry of update.parsed ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p     = entry as any;
      const rawId = (p.id as string).replace(/^0x/, "");
      const sym   = idToSym[rawId];
      if (!sym) continue;

      const expo  = p.price.expo as number;
      const scale = Math.pow(10, expo);
      const price = Math.abs(Number(p.price.price) * scale);
      const conf  = Number(p.price.conf) * scale;

      if (price > 0) {
        // CI as % of price, annualized (×√8760) to match the annualized RV scale
        result[sym] = parseFloat(((conf / price) * Math.sqrt(8760) * 100).toFixed(4));
      }
    }
  } catch { /* return empty on error */ }
  return result;
}

function ciAlignmentVerdict(ratio: number): AssetVolatility["ciAlignment"] {
  if (ratio <= 0)   return "unknown";
  if (ratio < 0.5)  return "tight";    // CI much tighter than realized vol — over-confident
  if (ratio < 1.5)  return "aligned";  // CI roughly matches realized vol — well calibrated
  return "wide";                        // CI wider than realized vol — conservative
}

export async function GET(): Promise<NextResponse> {
  const now  = Math.floor(Date.now() / 1000);
  const from = now - 8 * 24 * 3600; // 8-day window so we get full 7d + buffer

  const symbols = Object.keys(BENCHMARKS_SYMBOLS);

  // Fire candle requests AND live CI fetch in parallel
  const [results, liveCI] = await Promise.all([
    Promise.allSettled(
      symbols.map(async (sym) => {
        const benchSymbol = BENCHMARKS_SYMBOLS[sym];
        const candles     = await getHistoricalCandles(benchSymbol, "60", from, now);
        return { sym, candles };
      })
    ),
    fetchLiveCIWidths(symbols),
  ]);

  const assets: AssetVolatility[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { sym, candles } = result.value;
    if (candles.length < 10) continue;

    const closes     = candles.map((c) => c.close);
    const rv7d       = annualizedRV(closes, 7 * 24);
    const rv24h      = annualizedRV(closes, 24);
    const ciWidthPct = liveCI[sym] ?? 0;
    const ciRvRatio  = rv7d > 0 && ciWidthPct > 0 ? parseFloat((ciWidthPct / rv7d).toFixed(3)) : 0;

    assets.push({
      symbol:      sym,
      rv7d:        parseFloat(rv7d.toFixed(2)),
      rv24h:       parseFloat(rv24h.toFixed(2)),
      rvTrend:     parseFloat((rv24h - rv7d).toFixed(2)),
      regime:      classifyRegime(rv7d),
      closes:      closes.slice(-48), // last 48h for sparkline
      dataPoints:  candles.length,
      ciWidthPct,
      ciRvRatio,
      ciAlignment: ciAlignmentVerdict(ciRvRatio),
    });
  }

  // Sort: highest 7d RV first
  assets.sort((a, b) => b.rv7d - a.rv7d);

  return NextResponse.json(assets, {
    headers: {
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
    },
  });
}
