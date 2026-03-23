# Pyth Insight

> Oracle intelligence platform built on Pyth Network price feeds — submitted to the Pyth Playground Hackathon 2026.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Pyth Network](https://img.shields.io/badge/Pyth-Price%20Feeds-purple)](https://pyth.network)

---

## What It Does

Pyth Insight turns raw oracle data into actionable intelligence. It is not a price ticker — it is an analytical layer on top of Pyth's real-time price feeds that surfaces what the data is actually saying about market conditions, confidence, and statistical reliability.

**Live Price Feeds** — Every feed available on Pyth Hermes dynamically discovered and displayed — crypto, forex, metals, and more. Prices polled in batches every 3 seconds. Each card shows the live price, confidence interval (CI), CI width, EMA deviation, and a real-time quality classification (tight / normal / wide / extreme).

**CI Calibration Analysis** *(flagship)* — Tests whether Pyth's published confidence intervals are statistically accurate. A correctly calibrated ±1σ CI should contain the true price 68.3% of the time; ±2σ should contain it 95.4%. This page fetches historical price snapshots from Hermes, tests that hypothesis across major assets, and renders an empirical-vs-theoretical calibration chart. Assets that are over- or under-confident are flagged — information directly useful for DeFi protocols relying on Pyth for risk calculations.

**Volatility Dashboard** — Realized volatility rankings across tracked assets, computed from historical hourly prices. Shows 24h vs 7d RV with trend direction and vol regime classification (low / medium / high / extreme).

**Oracle Challenge (Game)** — A provably fair prediction game seeded by live Pyth oracle data. Each round, the API attempts the full Pyth Entropy pipeline — Fortuna REST API → BaseScan event index → `eth_getLogs` on the Entropy contract (`0x98046Bd286715D3B0BC227Dd7a956b83D8978603`) — then falls back to a live Pyth Hermes BTC/USD oracle attestation, packing `price | conf | ema_price | publish_time` into a 32-byte seed signed by Pyth validators. The game shows a "✓ Real Entropy" badge with the entropy source and seed formula displayed, so anyone can verify the round seed by re-querying Hermes. Players bet whether the next Pyth price lands inside or outside the live CI.

**AI Oracle Analyst** — Streaming chat interface powered by Gemini (with Claude fallback) injected with a live snapshot of all connected Pyth feeds, so it can answer questions about what is happening on-chain right now.

---

## Pyth Integration

| Feature | Pyth API Used |
|---|---|
| Full feed catalogue (dynamic) | Hermes REST (`/v2/price_feeds`) |
| Live price polling (3s batches) | Hermes REST (`/v2/updates/price/latest`) |
| Historical calibration snapshots | Hermes REST (`/v2/updates/price/{timestamp}`) |
| Volatility + sparkline candles | **Pyth Benchmarks** (`benchmarks.pyth.network/v1/shims/tradingview/history`) |
| Entropy seed / randomness | Pyth Entropy contract on Base (full event pipeline) + Pyth Hermes BTC/USD attestation fallback |
| Feed metadata & SDK | `@pythnetwork/hermes-client` |

All feed IDs are sourced dynamically from Hermes at runtime — no hardcoded ID lists. The Volatility Dashboard and all sparkline charts are powered by the [Pyth Benchmarks API](https://benchmarks.pyth.network), using the TradingView-compatible OHLCV endpoint.

---

## Tech Stack

- **Framework** — Next.js 15 (App Router, React 19)
- **Language** — TypeScript (strict mode, 0 errors)
- **Styling** — Tailwind CSS
- **State** — Zustand v5
- **Charts** — Recharts, D3.js
- **AI** — Google Gemini (dynamic model discovery) with Anthropic Claude fallback
- **Oracle SDK** — `@pythnetwork/hermes-client`

---

## Running Locally

```bash
git clone https://github.com/DE-LIGHTPRO/pyth-insight
cd pyth-insight
npm install
cp .env.example .env.local   # fill in any keys you want (see below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env.local`. All keys are optional except for the AI Analyst:

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | For AI Analyst | Google AI Studio — free tier works |
| `ANTHROPIC_API_KEY` | Optional | Claude fallback for AI Analyst |
| `PYTH_PRO_API_KEY` | Optional | Enables Pyth Benchmarks fallback in calibration |
| `ALCHEMY_RPC_URL` | Optional | Wider block range for Entropy event queries on Base |
| `BASESCAN_API_KEY` | Optional | Entropy contract event index (free at basescan.org) |
| `NEXT_PUBLIC_GITHUB_URL` | Optional | GitHub link shown in the navbar |

**Price feeds, calibration, volatility, and the game all run without any API key** — Pyth Hermes and Benchmarks APIs are public.

---

## Project Structure

```
app/
  dashboard/feeds/          Live price feeds (1,400+ Pyth feeds)
  dashboard/calibration/    CI Calibration Analysis (flagship)
  dashboard/volatility/     Realized volatility dashboard
  game/                     Oracle Challenge — Entropy-powered prediction game
  ai/                       AI Oracle Analyst
  learn/                    Educational content (4 pages)
components/
  PriceFeedCard             Price card with CI bar and flash animations
  PriceFeedGrid             Sortable, filterable feed grid
lib/
  pyth/hermes.ts            Hermes REST integration + types
  pyth/benchmarks.ts        Historical price fetching (Hermes snapshots)
  pyth/price-ids.ts         Official Pyth feed ID registry
  stores/priceStore.ts      Zustand live price state + batch polling
```

---

## Hackathon

Built for the [Pyth Playground Community Hackathon](https://forum.pyth.network/t/pyth-playground-community-hackathon/2363) — March 4 – April 1, 2026.

Prize tracks targeted: Top placement · Most Creative Pyth Pro Use · Best Promotional/Educational Content · Community Choice

---

## License

[Apache License 2.0](LICENSE)
