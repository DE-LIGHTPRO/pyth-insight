/**
 * GET /api/sparkline?symbol=Crypto.BTC/USD
 *
 * Returns 24 hourly close prices for sparkline rendering on feed cards.
 * Uses the Pyth Benchmarks TradingView shim — ONE request = all 24 bars.
 *
 * Rate limit: 90 req/10s (TradingView endpoints get higher limit).
 * Cache: 5 min s-maxage so repeat views don't re-hit Benchmarks.
 */

import { NextRequest, NextResponse } from "next/server";
import { getHistoricalCandles }      from "@/lib/pyth/benchmarks";

export const runtime = "nodejs";

export interface SparklineResponse {
  points:    { t: number; c: number }[]; // unix timestamp, close price
  change24h: number;                     // % change from first to last bar
  high24h:   number;
  low24h:    number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const symbol = req.nextUrl.searchParams.get("symbol"); // e.g. "Crypto.BTC/USD"

  if (!symbol) {
    return NextResponse.json({ error: "symbol query param required" }, { status: 400 });
  }

  const now  = Math.floor(Date.now() / 1000);
  const from = now - 25 * 3600; // 25h window — ensures we get a full 24 bars

  try {
    const candles = await getHistoricalCandles(symbol, "60", from, now);

    if (candles.length < 3) {
      return NextResponse.json(
        { error: "insufficient data — feed may not support Benchmarks" },
        { status: 404 }
      );
    }

    const closes   = candles.map((c) => c.close);
    const first    = closes[0];
    const last     = closes[closes.length - 1];
    const change24h = first > 0 ? ((last - first) / first) * 100 : 0;
    const high24h  = Math.max(...candles.map((c) => c.high));
    const low24h   = Math.min(...candles.map((c) => c.low));

    const body: SparklineResponse = {
      points:    candles.map((c) => ({ t: c.time, c: c.close })),
      change24h,
      high24h,
      low24h,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/sparkline] error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
