/**
 * /api/feeds — Dynamic Pyth feed catalogue
 *
 * Fetches the complete list of available price feeds from Hermes
 * /v2/price_feeds, returning normalised metadata for every feed.
 * Cached for 1 hour — the catalogue rarely changes.
 */

import { NextResponse } from "next/server";

export const runtime   = "nodejs";
export const revalidate = 3600; // 1-hour ISR cache

const HERMES = "https://hermes.pyth.network";

export interface FeedMeta {
  id:            string; // raw hex, no 0x prefix
  symbol:        string; // e.g. "BTC/USD"
  pythSymbol:    string; // e.g. "Crypto.BTC/USD"
  assetType:     string; // "crypto" | "fx" | "metal" | "equity" | ...
  base:          string; // e.g. "BTC"
  quoteCurrency: string; // e.g. "USD"
  description:   string;
}

export async function GET(): Promise<NextResponse> {
  try {
    // Fetch ALL available feeds — no asset_type filter so we get everything
    const res = await fetch(`${HERMES}/v2/price_feeds`, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Hermes returned ${res.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any[] = await res.json();

    const feeds: FeedMeta[] = raw
      .map((f) => {
        const attr = f.attributes ?? {};
        const sym  = attr.display_symbol ?? attr.description ?? attr.symbol ?? f.id;
        const base = attr.base ?? sym.split("/")[0];
        return {
          id:            (f.id as string).replace(/^0x/, ""),
          symbol:        sym,
          pythSymbol:    attr.symbol ?? sym,
          assetType:     (attr.asset_type ?? "other").toLowerCase(),
          base:          base,
          quoteCurrency: attr.quote_currency ?? "USD",
          description:   attr.description ?? sym,
        } satisfies FeedMeta;
      })
      // Only USD-quoted feeds; non-USD pairs add noise without adding value
      .filter((f) => f.quoteCurrency === "USD" || f.symbol.endsWith("/USD"))
      // Sort: crypto first, then alphabetically within each type
      .sort((a, b) => {
        if (a.assetType !== b.assetType) {
          const order: Record<string, number> = { crypto: 0, fx: 1, metal: 2, equity: 3 };
          return (order[a.assetType] ?? 9) - (order[b.assetType] ?? 9);
        }
        return a.symbol.localeCompare(b.symbol);
      });

    return NextResponse.json(feeds, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[/api/feeds] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch feed catalogue" }, { status: 502 });
  }
}
