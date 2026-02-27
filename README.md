# Pyth Insight

> Oracle intelligence platform built on Pyth Network price feeds — submitted to the Pyth Playground Hackathon 2026.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Pyth Network](https://img.shields.io/badge/Pyth-Price%20Feeds-purple)](https://pyth.network)

---

## What It Does

Pyth Insight turns raw oracle data into actionable intelligence. It is not a price ticker — it is an analytical layer on top of Pyth's real-time price feeds that surfaces what the data is actually saying about market conditions, confidence, and statistical reliability.

**Live Price Feeds** — Every feed available on Pyth Hermes dynamically discovered and displayed — crypto, forex, metals, and more. Prices polled in batches at 1-second intervals. Each card shows the live price, confidence interval (CI), CI width, EMA deviation, and a real-time quality classification (tight / normal / wide / extreme).

**CI Calibration Analysis** *(flagship)* — Tests whether Pyth's published confidence intervals are statistically accurate. A correctly calibrated ±1σ CI should contain the true price 68.3% of the time; ±2σ should contain it 95.4%. This page runs that test against historical data from the Pyth Benchmarks API and shows whether the oracle is over- or under-confident — information that is directly useful for DeFi protocols relying on Pyth for risk calculations.

**Volatility Dashboard** — Intraday volatility surface across all tracked assets, derived from live CI data.

**AI Oracle Analyst** — Conversational interface powered by Claude that answers questions about current Pyth feed conditions, CI calibration status, and oracle health in plain language.

---

## Pyth Integration

| Feature | Pyth API Used |
|---|---|
| Full feed catalogue (dynamic) | Hermes REST (`/v2/price_feeds`) |
| Live price polling (1s batches) | Hermes REST (`/v2/updates/price/latest`) |
| Historical calibration data | Pyth Benchmarks API (`benchmarks.pyth.network`) |
| Feed metadata & SDK | `@pythnetwork/hermes-client` |
| AI data layer (March 2+) | Pyth MCP Server (with direct-API fallback) |

All feed IDs are sourced dynamically from Hermes at runtime — no hardcoded ID lists.

---

## Tech Stack

- **Framework** — Next.js 15 (App Router, React 19)
- **Language** — TypeScript (strict mode, 0 errors)
- **Styling** — Tailwind CSS
- **State** — Zustand v5
- **Charts** — Recharts, D3.js
- **AI** — Anthropic Claude SDK (`@anthropic-ai/sdk`)
- **Oracle SDK** — `@pythnetwork/hermes-client`

---

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No API keys required for price feeds — Pyth Hermes is public. For the AI Analyst, add your Anthropic key:

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Project Structure

```
app/
  dashboard/feeds/          Live price feeds
  dashboard/calibration/    CI Calibration Analysis (flagship)
  dashboard/volatility/     Volatility dashboard
  ai/                       AI Oracle Analyst
  learn/                    Educational content
components/
  PriceFeedCard             Price card with CI bar and flash animations
  PriceFeedGrid             Sortable, filterable feed grid
  PythLogo                  Official Pyth Network SVG mark
lib/
  pyth/hermes.ts            Hermes REST integration + types
  pyth/benchmarks.ts        Benchmarks API (historical data)
  pyth/price-ids.ts         Official Pyth feed ID registry
  stores/priceStore.ts      Zustand live price state
```

---

## Hackathon

Built for the [Pyth Playground Hackathon](https://pyth.network) — Round 1 (March 4 – April 1, 2026).

Prize tracks: Top placement · Best Educational Content · Community Choice

---

## License

[Apache License 2.0](LICENSE)
