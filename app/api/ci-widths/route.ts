/**
 * GET /api/ci-widths
 *
 * Dedicated lightweight endpoint — fetches live Pyth CI widths for all
 * tracked symbols via Hermes and returns annualized CI-width-as-%-of-price.
 *
 * Runs in its own serverless invocation, completely isolated from the heavy
 * /api/volatility lambda (which makes 17 concurrent Benchmarks requests).
 * This isolation is intentional to avoid connection starvation.
 *
 * Response: Record<symbol, annualizedCIWidthPct>
 *   e.g. { "BTC/USD": 5.24, "ETH/USD": 7.11, ... }
 *
 * Annualization: (conf / price) * √8760 * 100
 *   Makes CI width comparable to annualized realized-vol figures.
 *
 * Cached 60s — CI doesn't need to be fresher than that for alignment analysis.
 */

import { NextResponse }                  from "next/server";
import { getHermesClient }               from "@/lib/pyth/hermes";
import { PRICE_IDS, BENCHMARKS_SYMBOLS } from "@/lib/pyth/price-ids";

export const runtime     = "nodejs";
export const maxDuration = 15;

export async function GET(): Promise<NextResponse> {
  const symbols = Object.keys(BENCHMARKS_SYMBOLS);

  // Build priceId array and reverse-lookup map
  const priceIds: string[]             = [];
  const idToSym:  Record<string, string> = {};
  for (const sym of symbols) {
    const raw = PRICE_IDS[sym]?.replace(/^0x/, "");
    if (raw) { priceIds.push(raw); idToSym[raw] = sym; }
  }

  const result: Record<string, number> = {};

  try {
    const client = getHermesClient();
    const update = await client.getLatestPriceUpdates(priceIds, { parsed: true });

    for (const entry of update.parsed ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p     = entry as any;
      const rawId = (p.id as string).replace(/^0x/, "");
      const sym   = idToSym[rawId];
      if (!sym) continue;

      const expo  = p.price.expo  as number;
      const scale = Math.pow(10, expo);
      const price = Math.abs(Number(p.price.price) * scale);
      const conf  = Number(p.price.conf) * scale;

      if (price > 0) {
        // Annualized CI width as % of price — mirrors the annualized RV scale
        result[sym] = parseFloat(((conf / price) * Math.sqrt(8760) * 100).toFixed(4));
      }
    }
  } catch (err) {
    // Surface the error so we can see it in Vercel logs; return partial result
    console.error("[ci-widths] Hermes fetch failed:", err);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
    },
  });
}
