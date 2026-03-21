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

**Oracle Challenge (Game)** — An Entropy-powered prediction game. Each 30-second round, the Pyth Entropy sequence number on Base (Fortuna provider) is combined with the actual block hash and a minute-bucket to derive a deterministic seed — selecting one of 12 live Pyth feeds. Players bet whether the next price will land inside or outside Pyth's real-time CI. The seed formula and Basescan block hash link are shown so anyone can verify the result was not manipulated.

**AI Oracle Analyst** — Streaming chat interface powered by Gemini (with Claude fallback) injected with a live snapshot of all connected Pyth feeds, so it can answer questions about what is happening on-chain right now.

---

## Pyth Integration

| Feature | Pyth API Used |
|---|---|
| Full feed catalogue (dynamic) | Hermes REST (`/v2/price_feeds`) |
| Live price polling (3s batches) | Hermes REST (`/v2/updates/price/latest`) |
| Historical calibration snapshots | Hermes REST (`/v2/updates/price/{timestamp}`) |
| Entropy seed / randomness | Pyth Fortuna on Base + `eth_getBlockByNumber` RPC |
| Feed metadata & SDK | `@pythnetwork/hermes-client` |

All feed IDs are sourced dynamically from Hermes at runtime — no hardcoded ID lists.

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
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No API keys required for price feeds — Pyth Hermes is public. For the AI Analyst, add a Gemini or Anthropic key:

```bash
# .env.local
GEMINI_API_KEY=AIza...        # Google AI Studio — free tier works
ANTHROPIC_API_KEY=sk-ant-...  # optional — used if set, Gemini otherwise
```

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

Built for the [Pyth Playground Hackathon](https://pyth.network) — Round 1 (March 4 – April 1, 2026).

Prize tracks: Top placement · Best Educational Content · Community Choice

---

## License

[Apache License 2.0](LICENSE)
