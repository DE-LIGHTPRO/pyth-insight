/**
 * Zustand price store — manages live Pyth price state
 *
 * Strategy: REST polling every 500ms via Hermes /v2/updates/price/latest
 * This is more reliable than SSE for browser environments and gives
 * sub-second updates suitable for a live dashboard.
 *
 * NOTE: No "use client" — plain module, not a React component.
 */

import { create } from "zustand";
import { type ParsedPrice } from "@/lib/pyth/hermes";
import { RAW_IDS, ID_TO_SYMBOL } from "@/lib/pyth/price-ids";

const HERMES_BASE = "https://hermes.pyth.network";
const POLL_MS     = 500; // poll every 500ms

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LivePrice extends ParsedPrice {
  prevPrice:   number | null;
  direction:   "up" | "down" | null;
  flashAt:     number | null;
  updateCount: number;
}

export type StreamStatus = "idle" | "connecting" | "connected" | "error";

interface PriceStore {
  prices:       Record<string, LivePrice>;
  status:       StreamStatus;
  lastUpdateAt: number | null;
  totalUpdates: number;
  sortBy:       "symbol" | "price" | "conf" | "change";
  sortDir:      "asc"   | "desc";

  initStream:      () => void;
  cleanup:         () => void;
  setSortBy:       (key: PriceStore["sortBy"]) => void;
  getSortedPrices: () => LivePrice[];
  _applyUpdates:   (incoming: ParsedPrice[]) => void;
}

// ── Module-level poll timer (singleton) ───────────────────────────────────────
let pollTimer: ReturnType<typeof setInterval> | null = null;

// ── URL builder ───────────────────────────────────────────────────────────────
// NOTE: Do NOT use URLSearchParams for ids[] — it percent-encodes [ and ] to
// %5B and %5D which Hermes does not recognise. Build the query string manually.
function buildRestURL(): string {
  const idsStr = RAW_IDS.map((id) => `ids[]=${id}`).join("&");
  return `${HERMES_BASE}/v2/updates/price/latest?${idsStr}&parsed=true&ignore_invalid_price_ids=true`;
}

// ── Price parser ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEntry(p: any): ParsedPrice {
  const expo   = p.price.expo as number;
  const scale  = Math.pow(10, expo);
  const price  = Number(p.price.price) * scale;
  const conf   = Number(p.price.conf)  * scale;
  const eScale = Math.pow(10, p.ema_price.expo as number);
  const rawId  = (p.id as string).replace(/^0x/, "");
  return {
    id:          p.id as string,
    symbol:      ID_TO_SYMBOL[rawId] ?? rawId.slice(0, 8) + "…",
    price,
    conf,
    confPct:     price > 0 ? (conf / price) * 100 : 0,
    emaPrice:    Number(p.ema_price.price) * eScale,
    publishTime: p.price.publish_time as number,
    expo,
  };
}

// ── Fetch one batch of prices ─────────────────────────────────────────────────
async function fetchPrices(): Promise<ParsedPrice[]> {
  const res  = await fetch(buildRestURL());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hermes ${res.status}: ${text.slice(0, 120)}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: { parsed?: any[] } = await res.json();
  return (data.parsed ?? []).map(parseEntry);
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const usePriceStore = create<PriceStore>((set, get) => ({
  prices:       {},
  status:       "idle",
  lastUpdateAt: null,
  totalUpdates: 0,
  sortBy:       "symbol",
  sortDir:      "asc",

  initStream: () => {
    if (pollTimer)                    return; // already running
    if (typeof window === "undefined") return; // server-side guard

    set({ status: "connecting" });

    // ── Run immediately, then on interval ────────────────────────────────────
    const tick = () => {
      fetchPrices()
        .then((parsed) => {
          get()._applyUpdates(parsed);
          if (get().status !== "connected") set({ status: "connected" });
        })
        .catch((err: Error) => {
          console.error("[PriceStore] fetch error:", err.message);
          if (get().status !== "connected") set({ status: "error" });
        });
    };

    tick(); // immediate first load
    pollTimer = setInterval(tick, POLL_MS);
  },

  cleanup: () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    set({ status: "idle" });
  },

  _applyUpdates: (incoming) => {
    set((state) => {
      const now     = Date.now();
      const updated = { ...state.prices };

      incoming.forEach((p) => {
        if (!p.symbol || p.symbol.includes("…")) return;
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
        };
      });

      return {
        prices:       updated,
        lastUpdateAt: now,
        totalUpdates: state.totalUpdates + incoming.length,
      };
    });
  },

  cleanup_done: () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    set({ status: "idle", prices: {} });
  },

  setSortBy: (key) =>
    set((state) => ({
      sortBy:  key,
      sortDir: state.sortBy === key && state.sortDir === "asc" ? "desc" : "asc",
    })),

  getSortedPrices: () => {
    const { prices, sortBy, sortDir } = get();
    const items = Object.values(prices);
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "symbol":  cmp = a.symbol.localeCompare(b.symbol); break;
        case "price":   cmp = a.price - b.price;                break;
        case "conf":    cmp = a.confPct - b.confPct;            break;
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
