import { NextRequest, NextResponse } from "next/server";
import { PRICE_IDS } from "@/lib/pyth/price-ids";
import {
  getPriceSnapshots,
  computeCalibration,
  computeHealthScore,
  getVerdict,
  type CalibrationResult,
} from "@/lib/pyth/benchmarks";

export const runtime = "nodejs";
// Max execution time on Vercel Hobby (60s). Fetching 7d at 60-min intervals
// makes ~168 HTTP calls batched 25 at a time → ~3-4 seconds.
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;

  const symbol  = searchParams.get("symbol") ?? "BTC/USD";   // e.g. "BTC/USD"
  const days    = Math.min(Math.max(parseInt(searchParams.get("days") ?? "7", 10), 1), 30);
  const horizon = parseInt(searchParams.get("horizon") ?? "60", 10); // seconds

  // ── Resolve price ID ────────────────────────────────────────────────────────
  const rawIdWithPrefix = PRICE_IDS[symbol];
  if (!rawIdWithPrefix) {
    return NextResponse.json({ error: `Unknown symbol: ${symbol}` }, { status: 400 });
  }
  // Benchmarks API accepts ID with or without 0x; strip to be safe
  const priceId = rawIdWithPrefix.replace(/^0x/, "");

  // ── Time range ──────────────────────────────────────────────────────────────
  const now  = Math.floor(Date.now() / 1000);
  const from = now - days * 86400;

  // 120-min intervals → 36 snapshots over 3 days (vs 72 at 60min).
  // Fewer requests = less rate-limit pressure; still ≥ 30 data points, plenty
  // for statistically meaningful calibration curves.
  const intervalMinutes = 120;

  try {
    const snapshots = await getPriceSnapshots(priceId, from, now, intervalMinutes);

    if (snapshots.length < 10) {
      return NextResponse.json(
        { error: "Insufficient data from Benchmarks API. Try a different symbol or period." },
        { status: 503 }
      );
    }

    const points     = computeCalibration(snapshots, horizon);
    const score      = computeHealthScore(points);
    const verdict    = getVerdict(score);

    const result: CalibrationResult & { sampleSize: number } = {
      symbol,
      points,
      healthScore: score,
      verdict,
      samplePeriodDays: days,
      sampleSize: snapshots.length,
    };

    return NextResponse.json(result, {
      headers: {
        // Cache for 10 minutes — Benchmarks data is historical
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/calibration] error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
