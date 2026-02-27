/**
 * Zustand price store — dynamic Pyth price state
 *
 * Strategy:
 *  1. On initStream(), call /api/feeds to discover EVERY available Pyth feed.
 *  2. Split feed IDs into batches of BATCH_SIZE to stay within URL length limits.
 *  3. Poll each batch at POLL_MS via Hermes /v2/updates/price/latest.
 *  4. Merge results into a single prices map keyed by display symbol.
 *
 * NOTE: No "use client" — plain module, not a React component.
 */

import { create }          from "zustand";
import { type ParsedPrice } from "@/lib/pyth/hermes";
import { type FeedMeta }   from "@/app/api/feeds/route";

const HERMES_BASE = "https://hermes.pyth.network";
const POLL_MS     = 3000;   // 3-second poll — 1s caused 37 concurrent batches/s, overloading browser HTTP connections
const BATCH_SIZE  = 100;    // was 50 → 1838/100 = 19 batches (was 37), keeps URL length safe

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LivePrice extends ParsedPrice {
  prevPrice:   number | null;
  direction:   "up" | "down" | null;
  flashAt:     number | null;
  updateCount: number;
  assetType:   string;
  base:        string;
  pythSymbol:  string; // e.g. "Crypto.BTC/USD" — needed for Benchmarks TradingView shim
}

export type StreamStatus = "idle" | "connecting" | "connected" | "error";

interface PriceStore {
  prices:       Record<string, LivePrice>;
  feeds:        FeedMeta[];               // full catalogue from /api/feeds
  status:       StreamStatus;
  lastUpdateAt: number | null;
  totalUpdates: number;
  sortBy:       "symbol" | "price" | "conf" | "change";
  sortDir:      "asc"   | "desc";
  filterType:   string;                   // "all" | "crypto" | "fx" | "metal" | ...

  initStream:      () => void;
  cleanup:         () => void;
  setSortBy:       (key: PriceStore["sortBy"]) => void;
  setFilterType:   (type: string) => void;
  getSortedPrices: () => LivePrice[];
  _applyUpdates:   (incoming: ParsedPrice[], meta: Map<string, FeedMeta>) => void;
}

// ── Module-level state (singleton) ────────────────────────────────────────────
let pollTimers: ReturnType<typeof setInterval>[] = [];
let feedMeta:   Map<string, FeedMeta>            = new Map(); // id → FeedMeta

// ── URL builder ───────────────────────────────────────────────────────────────
// NOTE: Do NOT use URLSearchParams for ids[] — it percent-encodes [ and ] to
// %5B and %5D which Hermes does not recognise. Build the query string manually.
function buildBatchURL(ids: string[]): string {
  const idsStr = ids.map((id) => `ids[]=${id}`).join("&");
  return `${HERMES_BASE}/v2/updates/price/latest?${idsStr}&parsed=true&ignore_invalid_price_ids=true`;
}

// ── Price parser ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEntry(p: any, meta: Map<string, FeedMeta>): ParsedPrice {
  const expo   = p.price.expo as number;
  const scale  = Math.pow(10, expo);
  const price  = Number(p.price.price) * scale;
  const conf   = Number(p.price.conf)  * scale;
  const eScale = Math.pow(10, p.ema_price.expo as number);
  const rawId  = (p.id as string).replace(/^0x/, "");
  const feed   = meta.get(rawId);
  const symbol = feed?.symbol ?? rawId.slice(0, 8) + "…";

  return {
    id:          p.id as string,
    symbol,
    price,
    conf,
    confPct:     price > 0 ? (conf / price) * 100 : 0,
    emaPrice:    Number(p.ema_price.price) * eScale,
    publishTime: p.price.publish_time as number,
    expo,
  };
}

// ── Fetch one batch of prices ─────────────────────────────────────────────────
async function fetchBatch(ids: string[], meta: Map<string, FeedMeta>): Promise<ParsedPrice[]> {
  const res  = await fetch(buildBatchURL(ids));
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hermes ${res.status}: ${text.slice(0, 120)}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: { parsed?: any[] } = await res.json();
  return (data.parsed ?? []).map((p) => parseEntry(p, meta));
}

// ── Split array into chunks ────────────────────────────────────────────────────
function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePriceStore = create<PriceStore>((set, get) => ({
  prices:       {},
  feeds:        [],
  status:       "idle",
  lastUpdateAt: null,
  totalUpdates: 0,
  sortBy:       "symbol",
  sortDir:      "asc",
  filterType:   "crypto", // default to crypto — "all" renders 680+ cards and is too slow

  initStream: async () => {
    if (pollTimers.length > 0)          return; // already running
    if (typeof window === "undefined")  return; // SSR guard

    set({ status: "connecting" });

    // ── Shared tick factory — used in both phases ──────────────────────────────
    const tick = (batchIds: string[]) => () => {
      fetchBatch(batchIds, feedMeta)
        .then((parsed) => {
          get()._applyUpdates(parsed, feedMeta);
          if (get().status !== "connected") set({ status: "connected" });
        })
        .catch((err: Error) => {
          console.error("[PriceStore] batch error:", err.message);
          if (get().status !== "connected") set({ status: "error" });
        });
    };

    // ── Feed catalogue transform (mirrors /api/feeds logic) ───────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformFeeds = (raw: any[]): FeedMeta[] =>
      raw
        .map((f) => {
          const attr = f.attributes ?? {};
          const sym  = attr.display_symbol ?? attr.description ?? attr.symbol ?? f.id;
          const base = attr.base ?? (sym as string).split("/")[0];
          return {
            id:            (f.id as string).replace(/^0x/, ""),
            symbol:        sym,
            pythSymbol:    attr.symbol ?? sym,
            assetType:     ((attr.asset_type ?? "other") as string).toLowerCase(),
            base,
            quoteCurrency: attr.quote_currency ?? "USD",
            description:   attr.description ?? sym,
          } satisfies FeedMeta;
        })
        .filter((f) => f.quoteCurrency === "USD" || f.symbol.endsWith("/USD"))
        .sort((a, b) => {
          if (a.assetType !== b.assetType) {
            const order: Record<string, number> = { crypto: 0, fx: 1, metal: 2, equity: 3 };
            return (order[a.assetType] ?? 9) - (order[b.assetType] ?? 9);
          }
          return a.symbol.localeCompare(b.symbol);
        });

    // ── Start polling a batch list — NO stagger on first tick ─────────────────
    // All first ticks fire immediately (setTimeout 0). HTTP/2 to hermes.pyth.network
    // multiplexes them on one connection — no browser limit issue.
    // setInterval staggers ongoing polls across the POLL_MS window.
    const startPolling = (ids: string[]) => {
      chunks(ids, BATCH_SIZE).forEach((batch, i) => {
        setTimeout(tick(batch), 0);                          // first tick: immediate
        pollTimers.push(setInterval(tick(batch), POLL_MS + i * 150)); // stagger ongoing
      });
    };

    try {
      // ── CACHE LAYER: instant warm visits ──────────────────────────────────
      const CACHE_KEY = "pyth_feeds_v4";
      const CACHE_TTL = 3_600_000; // 1 hour

      let cachedFeeds: FeedMeta[] | null = null;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { data, ts } = JSON.parse(raw) as { data: FeedMeta[]; ts: number };
          if (Date.now() - ts < CACHE_TTL) cachedFeeds = data;
        }
      } catch { /* localStorage blocked — ignore */ }

      if (cachedFeeds) {
        // Feed catalogue already in browser — start polling immediately
        feedMeta = new Map(cachedFeeds.map((f) => [f.id, f]));
        set({ feeds: cachedFeeds });
        startPolling(cachedFeeds.map((f) => f.id));
        // Background refresh to keep cache fresh
        fetch(`${HERMES_BASE}/v2/price_feeds`, { headers: { Accept: "application/json" } })
          .then((r) => r.ok ? r.json() : Promise.reject(r.status))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((raw: any[]) => {
            const fresh = transformFeeds(raw);
            try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fresh, ts: Date.now() })); } catch { /* ignore */ }
          })
          .catch(() => { /* silent — cached data still valid */ });
        return;
      }

      // ── PHASE 1 (cold visit): crypto feeds first — small payload, fast ────
      // Hermes supports ?asset_type=Crypto → ~515 feeds, ~130 KB vs ~500 KB for all.
      // Start showing crypto cards within ~300 ms while all feeds load in background.
      const cryptoRes = await fetch(
        `${HERMES_BASE}/v2/price_feeds?asset_type=Crypto`,
        { headers: { Accept: "application/json" } }
      );
      if (!cryptoRes.ok) throw new Error(`Hermes price_feeds returned ${cryptoRes.status}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cryptoFeeds = transformFeeds(await cryptoRes.json() as any[]);
      feedMeta = new Map(cryptoFeeds.map((f) => [f.id, f]));
      set({ feeds: cryptoFeeds });
      startPolling(cryptoFeeds.map((f) => f.id));   // ← cards appear immediately

      // ── PHASE 2 (background): remaining feeds — forex, metals, equities ───
      fetch(`${HERMES_BASE}/v2/price_feeds`, { headers: { Accept: "application/json" } })
        .then((r) => r.ok ? r.json() : Promise.reject(r.status))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((raw: any[]) => {
          const allFeeds  = transformFeeds(raw);
          const newFeeds  = allFeeds.filter((f) => f.assetType !== "crypto");

          // Extend feedMeta with non-crypto feeds
          newFeeds.forEach((f) => feedMeta.set(f.id, f));
          set({ feeds: allFeeds });

          // Start polling non-crypto feeds (lower priority — slight delay)
          setTimeout(() => startPolling(newFeeds.map((f) => f.id)), 500);

          // Persist full catalogue to cache for next visit
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: allFeeds, ts: Date.now() }));
          } catch { /* quota — ignore */ }
        })
        .catch((err) => console.warn("[PriceStore] background feed load failed:", err));

    } catch (err) {
      console.error("[PriceStore] init error:", err);
      // Fallback: try /api/feeds proxy if direct Hermes call failed
      try {
        const res = await fetch("/api/feeds");
        if (!res.ok) throw new Error(`/api/feeds returned ${res.status}`);
        const allFeeds: FeedMeta[] = await res.json();
        feedMeta = new Map(allFeeds.map((f) => [f.id, f]));
        set({ feeds: allFeeds });
        startPolling(allFeeds.map((f) => f.id));
      } catch {
        set({ status: "error" });
      }
    }
  },

  cleanup: () => {
    pollTimers.forEach(clearInterval);
    pollTimers = [];
    set({ status: "idle" });
  },

  _applyUpdates: (incoming, meta) => {
    set((state) => {
      const now       = Date.now();
      const nowSecs   = Math.floor(now / 1000);
      const MAX_AGE   = 604_800; // 7 days — forex/metals close on weekends (up to ~60 hrs stale)
                                    // Pyth Pro equity feeds are epoch-0 / decades old → still filtered
      const updated   = { ...state.prices };

      incoming.forEach((p) => {
        if (!p.symbol || p.symbol.includes("…")) return;
        // Skip feeds with stale publish times — these are Pyth Pro-only feeds
        // (e.g. equities) that don't publish to the free Hermes public endpoint
        if (nowSecs - p.publishTime > MAX_AGE) return;
        // Skip feeds with zero price (unpublished / no data)
        if (p.price === 0) return;

        const feed      = meta.get(p.id.replace(/^0x/, ""));
        const prev      = updated[p.symbol] ?? null;
        const prevPrice = prev?.price ?? null;
        const direction =
          prevPrice === null    ? null
          : p.price > prevPrice ? "up"
          : p.price < prevPrice ? "down"
          : prev?.direction ?? null;

        updated[p.symbol] = {
          ...p,
          prevPrice,
          direction,
          flashAt:     prevPrice !== null && prevPrice !== p.price ? now : (prev?.flashAt ?? null),
          updateCount: (prev?.updateCount ?? 0) + 1,
          assetType:   feed?.assetType ?? "other",
          base:        feed?.base ?? p.symbol.split("/")[0],
          pythSymbol:  feed?.pythSymbol ?? "",
        };
      });

      return {
        prices:       updated,
        lastUpdateAt: now,
        totalUpdates: state.totalUpdates + incoming.length,
      };
    });
  },

  setSortBy: (key) =>
    set((state) => ({
      sortBy:  key,
      sortDir: state.sortBy === key && state.sortDir === "asc" ? "desc" : "asc",
    })),

  setFilterType: (type) => set({ filterType: type }),

  getSortedPrices: () => {
    const { prices, sortBy, sortDir, filterType } = get();
    let items = Object.values(prices);

    // Filter by asset type
    if (filterType !== "all") {
      items = items.filter((p) => p.assetType === filterType);
    }

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "symbol":  cmp = a.symbol.localeCompare(b.symbol);  break;
        case "price":   cmp = a.price - b.price;                  break;
        case "conf":    cmp = a.confPct - b.confPct;              break;
        case "change": {
          const da = p_delta(a), db = p_delta(b);
          cmp = da - db;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  },
}));

function p_delta(p: LivePrice): number {
  return p.prevPrice ? (p.price - p.prevPrice) / p.prevPrice : 0;
}
