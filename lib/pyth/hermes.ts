/**
 * Pyth Hermes — Real-time price feed integration
 *
 * Uses the official @pythnetwork/hermes-client for server-side REST calls.
 * Uses native browser EventSource directly for client-side SSE streaming
 * (the library's EventSource import is the Node.js `eventsource` package,
 * so we bypass it for browser contexts to avoid SSR/client mismatches).
 *
 * Public API — no authentication required.
 * Rate limit: 30 req / 10s per IP
 * SSE connections auto-close after 24 hours — reconnect logic implemented.
 */

import { HermesClient, type PriceUpdate } from "@pythnetwork/hermes-client";

export type { PriceUpdate };

// ── Parsed price (human-readable floats applied) ─────────────────────────────

export interface ParsedPrice {
  id: string;
  symbol: string;
  price: number;
  conf: number;        // CI half-width in price units
  confPct: number;     // CI as % of price (e.g. 0.05 = 0.05%)
  emaPrice: number;
  publishTime: number; // unix seconds
  expo: number;
}

// ── Singleton HermesClient (server-side / API routes only) ───────────────────

let _client: HermesClient | null = null;

export function getHermesClient(): HermesClient {
  if (!_client) {
    _client = new HermesClient(
      process.env.NEXT_PUBLIC_HERMES_URL ?? "https://hermes.pyth.network",
      { timeout: 10_000, httpRetries: 3 }
    );
  }
  return _client;
}

// ── Server-side: fetch latest prices ─────────────────────────────────────────

export async function fetchLatestPrices(
  priceIds: string[],
  symbolMap: Record<string, string>
): Promise<ParsedPrice[]> {
  const client = getHermesClient();
  const update = await client.getLatestPriceUpdates(priceIds, { parsed: true });
  return (update.parsed ?? []).map((p) => parsePriceEntry(p, symbolMap));
}

// ── Server-side: price at a specific timestamp ───────────────────────────────

export async function fetchPriceAtTimestamp(
  priceIds: string[],
  timestamp: number,
  symbolMap: Record<string, string>
): Promise<ParsedPrice[]> {
  const client = getHermesClient();
  const update = await client.getPriceUpdatesAtTimestamp(timestamp, priceIds, { parsed: true });
  return (update.parsed ?? []).map((p) => parsePriceEntry(p, symbolMap));
}

// ── Client-side SSE streaming (browser native EventSource) ───────────────────

const HERMES_BASE = "https://hermes.pyth.network";

export interface StreamController {
  close: () => void;
}

/**
 * Opens a persistent SSE connection to Hermes.
 * Automatically reconnects on error (3s back-off) and before the 24h limit.
 */
export function openPriceStream(
  priceIds: string[],
  symbolMap: Record<string, string>,
  onUpdate: (prices: ParsedPrice[]) => void,
  onStatus?: (s: "connecting" | "connected" | "error") => void
): StreamController {
  let es: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const buildURL = () => {
    // NOTE: Do NOT use URLSearchParams here — it percent-encodes [ and ] to
    // %5B and %5D, which Hermes does not recognise. Build the query string manually.
    const idsStr = priceIds.map((id) => `ids[]=${id}`).join("&");
    return `${HERMES_BASE}/v2/updates/price/stream?${idsStr}&parsed=true&encoding=hex`;
  };

  const connect = () => {
    if (closed) return;
    onStatus?.("connecting");
    es = new EventSource(buildURL());

    es.onopen = () => {
      onStatus?.("connected");
      // Hermes drops SSE after 24h — reconnect 5 min before that
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        es?.close();
        connect();
      }, 23 * 60 * 60 * 1000 + 55 * 60 * 1000);
    };

    es.onmessage = (event: MessageEvent) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = JSON.parse(event.data as string) as { parsed?: any[] };
        const items = (data.parsed ?? []).map((p) => parsePriceEntry(p, symbolMap));
        if (items.length > 0) onUpdate(items);
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = (event) => {
      console.error("[Hermes SSE] Connection error:", event);
      onStatus?.("error");
      es?.close();
      if (!closed) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3_000);
      }
    };
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    },
  };
}

// ── Internal price parser ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parsePriceEntry(p: any, symbolMap: Record<string, string>): ParsedPrice {
  const expo   = p.price.expo as number;
  const scale  = Math.pow(10, expo);
  const price  = Number(p.price.price) * scale;
  const conf   = Number(p.price.conf) * scale;
  const eScale = Math.pow(10, p.ema_price.expo as number);

  // Hermes API may return IDs with OR without 0x prefix depending on endpoint/version.
  // Always strip the prefix before looking up in symbolMap (which uses stripped keys).
  const rawId  = (p.id as string).replace(/^0x/, "");

  return {
    id:          p.id as string,
    symbol:      symbolMap[rawId] ?? rawId.slice(0, 8) + "…",
    price,
    conf,
    confPct:     price > 0 ? (conf / price) * 100 : 0,
    emaPrice:    Number(p.ema_price.price) * eScale,
    publishTime: p.price.publish_time as number,
    expo,
  };
}

// ── Formatting helpers (used across components) ──────────────────────────────

export function formatPrice(price: number): string {
  if (price === 0)         return "—";
  if (price >= 100_000)    return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1_000)      return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 100)        return price.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  if (price >= 1)          return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (price >= 0.01)       return price.toLocaleString("en-US", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

export function formatConf(confPct: number): string {
  return confPct < 0.001 ? "<0.001%" : confPct.toFixed(4) + "%";
}

export function formatAge(publishTime: number): string {
  const ageMs = Date.now() - publishTime * 1000;
  if (ageMs < 2_000)  return "now";
  if (ageMs < 60_000) return `${Math.floor(ageMs / 1_000)}s ago`;
  return `${Math.floor(ageMs / 60_000)}m ago`;
}

export function confLabel(confPct: number): "tight" | "normal" | "wide" | "extreme" {
  if (confPct < 0.05)  return "tight";
  if (confPct < 0.2)   return "normal";
  if (confPct < 0.5)   return "wide";
  return "extreme";
}
