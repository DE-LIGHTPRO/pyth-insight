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
import { BENCHMARKS_SYMBOLS }    from "@/lib/pyth/price-ids";
import { getHistoricalCandles }  from "@/lib/pyth/benchmarks";

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

  // Fetch only Benchmarks candles here — CI data is fetched separately by
  // /api/ci-widths to avoid connection starvation in this lambda.
  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const benchSymbol = BENCHMARKS_SYMBOLS[sym];
      const candles     = await getHistoricalCandles(benchSymbol, "60", from, now);
      return { sym, candles };
    })
  );

  const assets: AssetVolatility[] = [];

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { sym, candles } = result.value;
    if (candles.length < 10) continue;

    const closes = candles.map((c) => c.close);
    const rv7d   = annualizedRV(closes, 7 * 24);
    const rv24h  = annualizedRV(closes, 24);

    // CI fields default to "unknown" — the page merges live values from /api/ci-widths
    assets.push({
      symbol:      sym,
      rv7d:        parseFloat(rv7d.toFixed(2)),
      rv24h:       parseFloat(rv24h.toFixed(2)),
      rvTrend:     parseFloat((rv24h - rv7d).toFixed(2)),
      regime:      classifyRegime(rv7d),
      closes:      closes.slice(-48), // last 48h for sparkline
      dataPoints:  candles.length,
      ciWidthPct:  0,
      ciRvRatio:   0,
      ciAlignment: "unknown",
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
