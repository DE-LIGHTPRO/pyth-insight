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

// ── Server-side in-memory cache ───────────────────────────────────────────────
// Prevents repeated Benchmarks API calls for the same query within the same
// warm Vercel function instance. TTL = 10 minutes (matches Cache-Control header).

const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  result: CalibrationResult & { sampleSize: number };
  expiresAt: number;
}

const calibrationCache = new Map<string, CacheEntry>();

function cacheKey(symbol: string, days: number, horizon: number): string {
  return `${symbol}:${days}:${horizon}`;
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Check in-memory cache ────────────────────────────────────────────────────
  const key = cacheKey(symbol, days, horizon);
  const cached = calibrationCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.result, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
        "X-Cache": "HIT",
      },
    });
  }

  // ── Time range ──────────────────────────────────────────────────────────────
  // Cap "to" at 2 hours ago — Benchmarks returns 422 for very recent timestamps
  // because the historical archive needs time to ingest and validate new data.
  const TWO_HOURS = 2 * 3600;
  const now  = Math.floor(Date.now() / 1000) - TWO_HOURS;
  const from = now - days * 86400;

  // 60-min intervals → 72 snapshots over 3 days.
  // Better statistical resolution than 120-min. Hermes handles the load fine
  // with our 5-req batches and 1.5s delays (fits inside 60s Vercel timeout).
  const intervalMinutes = 60;

  try {
    const snapshots = await getPriceSnapshots(priceId, from, now, intervalMinutes);

    if (snapshots.length < 10) {
      return NextResponse.json(
        { error: `Only ${snapshots.length} snapshots returned. The Benchmarks API may require a free API key — check server logs for HTTP status, or add PYTH_PRO_API_KEY to .env.local.` },
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

    // Store in cache
    calibrationCache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(result, {
      headers: {
        // Cache for 10 minutes — Benchmarks data is historical
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/calibration] error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
