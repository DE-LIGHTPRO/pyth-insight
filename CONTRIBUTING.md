# Contributing to Pyth Insight

Thanks for your interest in contributing. This document explains how to get the project running locally and how the codebase is structured.

## Prerequisites

- Node.js 20+
- npm 10+
- A free Google AI Studio key (for the AI Analyst page)

## Local Setup

```bash
git clone https://github.com/DE-LIGHTPRO/pyth-insight
cd pyth-insight
npm install
cp .env.example .env.local
```

Edit `.env.local` — only `GEMINI_API_KEY` is needed to use all features. Everything else is optional. Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The live feeds, CI calibration, volatility dashboard, and game all work immediately with no API key. The AI Analyst requires a Gemini or Anthropic key.

## Project Structure

```
app/
  page.tsx                    Landing page
  dashboard/
    feeds/                    Live price feeds — ~1,687 Pyth feeds
    calibration/              CI Calibration Analysis (flagship feature)
    volatility/               Realized volatility dashboard (Pyth Benchmarks)
  game/                       Oracle Challenge — Entropy + Hermes powered game
  ai/                         AI Oracle Analyst (Gemini / Claude)
  learn/
    how-pyth-works/           Pull oracle explainer
    confidence-intervals/     CI theory + calibration explainer
    entropy/                  Pyth Entropy commit-reveal explainer
    pyth-pro/                 Pyth Benchmarks + historical data explainer
  api/
    feeds/                    Proxies Hermes /v2/price_feeds
    prices/                   Proxies Hermes /v2/updates/price/latest
    calibration/              CI calibration computation endpoint
    volatility/               Realized volatility computation (uses Benchmarks)
    sparkline/                Historical sparkline data (uses Benchmarks)
    entropy/                  Pyth Entropy revelation pipeline + Hermes fallback
    ai/chat/                  Streaming AI chat (Gemini + Claude fallback)

components/
  Navbar.tsx                  Top navigation
  PriceFeedCard.tsx           Individual feed card (price, CI bar, sparkline)
  PriceFeedGrid.tsx           Sortable, filterable feed grid

lib/
  pyth/
    hermes.ts                 Hermes REST integration + types
    benchmarks.ts             Pyth Benchmarks OHLCV + historical snapshot fetching
    price-ids.ts              Official Pyth feed ID registry
    ai-data.ts                AI system prompt + data abstraction layer
  stores/
    priceStore.ts             Zustand live price state + 3s batch polling
```

## Pyth APIs Used

| API | Endpoint | Used For |
|---|---|---|
| Pyth Hermes | `hermes.pyth.network/v2/price_feeds` | Feed discovery |
| Pyth Hermes | `hermes.pyth.network/v2/updates/price/latest` | Live prices |
| Pyth Hermes | `hermes.pyth.network/v2/updates/price/{timestamp}` | CI calibration snapshots |
| Pyth Benchmarks | `benchmarks.pyth.network/v1/shims/tradingview/history` | Volatility OHLCV + sparklines |
| Pyth Entropy | `0x98046Bd286715D3B0BC227Dd7a956b83D8978603` on Base | Game entropy pipeline |

## Key Design Decisions

**No hardcoded feed IDs on the live feeds page** — all ~1,687 feeds are dynamically discovered from Hermes `/v2/price_feeds` at runtime and batched into groups of 100 for live polling.

**Entropy pipeline** — the game's `/api/entropy` route attempts the full Pyth Entropy event pipeline (Fortuna REST → BaseScan → `eth_getLogs`) before falling back to the live Pyth Hermes BTC/USD oracle attestation. All steps and their results are exposed in the response's `_debug` field.

**CI Calibration methodology** — fetches 72+ historical Hermes snapshots at 60-minute intervals, checks whether each price move landed inside the published CI band at multiple sigma levels (0.5σ–3σ), and scores the feed on a 0–100 scale.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
