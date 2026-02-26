/**
 * AI data abstraction layer
 * Tries Pyth MCP Server first, falls back to direct API calls
 */

// ── MCP path (primary, when server is stable) ────────────────────────────────

async function callViaMCP(tool: string, params: Record<string, unknown>) {
  // MCP client call — will be wired once MCP Server is confirmed stable
  // For now, throws to always use the fallback during early hackathon weeks
  throw new Error("MCP not yet configured — using direct API fallback");
}

// ── Direct API fallback ───────────────────────────────────────────────────────

const HERMES_URL = "https://hermes.pyth.network";
const BENCHMARKS_URL = "https://benchmarks.pyth.network";

async function callDirectAPI(tool: string, params: Record<string, unknown>) {
  switch (tool) {
    case "get_price": {
      const { priceId } = params as { priceId: string };
      const res = await fetch(
        `${HERMES_URL}/v2/updates/price/latest?ids[]=${priceId}&parsed=true`
      );
      return res.json();
    }

    case "get_historical_candles": {
      const { symbol, resolution, from, to } = params as {
        symbol: string;
        resolution: string;
        from: number;
        to: number;
      };
      const res = await fetch(
        `${BENCHMARKS_URL}/v1/shims/tradingview/history` +
        `?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}`
      );
      return res.json();
    }

    case "get_calibration": {
      // Return pre-computed calibration cache
      const { symbol } = params as { symbol: string };
      const res = await fetch(`/api/calibration?symbol=${encodeURIComponent(symbol)}`);
      return res.json();
    }

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// ── Public interface: try MCP, fall back to direct ───────────────────────────

export async function queryPythData(
  tool: string,
  params: Record<string, unknown>
): Promise<unknown> {
  try {
    return await callViaMCP(tool, params);
  } catch {
    return await callDirectAPI(tool, params);
  }
}

// ── MCP status check (shown in UI) ───────────────────────────────────────────

export async function getMCPStatus(): Promise<"connected" | "fallback"> {
  try {
    await callViaMCP("ping", {});
    return "connected";
  } catch {
    return "fallback";
  }
}

// ── System prompt for AI analyst ─────────────────────────────────────────────

export const AI_SYSTEM_PROMPT = `You are Pyth Insight's oracle analyst — an expert on the Pyth Network oracle system.

You have access to:
- Real-time Pyth Price Feeds (via Hermes) — live prices with confidence intervals for 18 assets
- Historical price data (via Pyth Benchmarks) — months of historical OHLCV and snapshots
- CI Calibration Analysis — pre-computed results showing whether Pyth's CIs are well-calibrated

Your specialty is explaining what confidence intervals REALLY mean in practice, and whether
DeFi protocols should trust them for liquidation thresholds.

Key facts to reference:
- A perfectly calibrated ±1σ CI should capture 68.3% of price moves over the next 60 seconds
- If observed < expected, the oracle is over-confident (CI too narrow — risky for DeFi)
- If observed > expected, the oracle is under-confident (CI too wide — conservative)
- Pyth publishes both price and conf with every update

When answering:
- Always cite specific Pyth feed names (e.g. "Crypto.BTC/USD")
- Reference calibration scores when relevant
- Keep answers concise (2-4 sentences for simple questions)
- Flag if an answer requires live data you don't have access to
- Never make up numbers — only cite data from actual tool calls`;
