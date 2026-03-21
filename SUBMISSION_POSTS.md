# Pyth Playground Community Hackathon — Submission Posts

> **Before posting:** Replace every `[YOUR-USERNAME]` with your GitHub username,
> `[YOUR-DISCORD]` with your Discord handle, and `[YOUR-WALLET]` with your EVM wallet address.
> Post order: **Forum first** (required) → Reddit → Dev.to (optional but earns bonus PYTH).

---

## 1. FORUM POST — dev-forum.pyth.network

**Title:**
```
[Submission] Pyth Insight — Oracle Intelligence Platform (CI Calibration · Entropy Game · AI Analyst)
```

**Body:**

---

### Project Name
**Pyth Insight** — Oracle Intelligence Platform

### One-line description
An on-chain analytics dashboard that stress-tests Pyth's confidence intervals with real historical data, challenges users with an Entropy-powered prediction game, and answers oracle questions live via an AI analyst.

### Live Demo
https://pyth-insight.vercel.app

### GitHub
https://github.com/[YOUR-USERNAME]/pyth-insight

### Which Pyth products are you using?

- **Pyth Price Feeds (Hermes)** — Live price + CI data for all 1,400+ feeds via `hermes.pyth.network/v2/updates/price/latest`, dynamically discovered at runtime — no hardcoded feed IDs
- **Pyth Hermes Historical API** — Historical price snapshots (`/v2/updates/price/{timestamp}`) used by the CI Calibration engine to fetch 72+ data points over 3–14 day windows and compare empirical vs theoretical confidence coverage
- **Pyth Entropy (Fortuna on Base)** — Provably fair feed selection in the Oracle Challenge game; seed = `FNV1a("pyth-entropy:" + sequenceNumber + ":" + blockHash + ":" + minuteBucket)` — block hash makes the seed unmanipulable before mining, verifiable on Basescan

### What does it do?

**CI Calibration Analysis** is the flagship feature. Pyth publishes a ±1σ confidence interval with every price update. In theory, 68.3% of subsequent price moves should land inside that band. Pyth Insight fetches 72+ historical snapshots from Hermes, tests that hypothesis, and renders an empirical-vs-theoretical calibration chart. Assets that are over-confident (CI too tight) or under-confident (CI too wide) are flagged with a 0–100 health score. Our live data shows BTC/USD is systematically **over-confident** — its observed coverage is 25–45% below theoretical at all sigma levels. This is directly useful for DeFi protocols using Pyth CIs as liquidation guards.

**Oracle Challenge** is a live Entropy-powered game. Each 30-second round, the Pyth Entropy sequence number on Base (Fortuna provider `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`) is combined with the current block hash and a minute-bucket to derive a deterministic seed. That seed selects one of 12 live Pyth feeds. Players bet whether the next published price will land inside or outside Pyth's real-time CI. The block hash and seed derivation formula are displayed in-app with a Basescan verification link.

**AI Oracle Analyst** is a streaming chat interface (Gemini with Claude fallback) injected with the current live Pyth feed snapshot as context — 1,400+ feeds worth of live prices and CI data — so it can answer questions about what is happening on-chain right now.

**Learn** contains four educational pages covering Pyth's push-vs-pull model, confidence interval theory, Pyth Entropy commit-reveal mechanics, and Pyth Hermes / Benchmarks APIs.

### Answer Capsule

Pyth Insight uses Pyth Price Feeds (live + historical via Hermes) and Pyth Entropy (Fortuna on Base) to stress-test oracle confidence intervals against real data and power a provably fair prediction game. It proves whether Pyth's published ±1σ CI actually captures 68.3% of price moves — and shows the answer varies significantly by asset.

### Tech stack
- Next.js 15 App Router, TypeScript (strict), Tailwind CSS, Recharts
- `@pythnetwork/hermes-client` for live feeds
- Pyth Hermes REST API for live + historical price data
- Pyth Entropy / Fortuna REST API + Base `eth_getBlockByNumber` RPC for randomness
- Google Gemini (dynamic model discovery) + Anthropic Claude (fallback AI)

### Screenshots / Video
[attach screenshots or link 2-minute demo video]

### Discord
[YOUR-DISCORD]

### Wallet Address (for prize distribution)
[YOUR-WALLET]

---

---

## 2. REDDIT POST — r/defi (or r/algotrading, r/cryptocurrency)

**Title:**
```
I built a tool that tests whether Pyth Oracle's confidence intervals are actually calibrated — results are surprising
```

**Body:**

---

Every Pyth price feed comes with a published confidence interval — essentially the oracle saying "I'm 68% sure the true price is within ±X of what I'm reporting." But does that hold up against real historical data?

I built **Pyth Insight** to find out. It pulls historical price snapshots from Pyth's Hermes API and tests whether the published ±1σ CI actually captures 68.3% of subsequent price moves.

**What the data shows for BTC/USD right now:**
- At ±1σ, the CI should capture 68.3% of moves — it actually captures ~45%
- At ±2σ, should capture 95.4% — actually captures ~70%
- Verdict: **systematically over-confident** across all sigma levels

This has real implications for DeFi lending protocols using Pyth CIs as liquidation buffers.

**Other features:**
- Oracle Challenge game — bet on whether Pyth's live CI is right, each round seeded by Pyth Entropy on Base (Fortuna provider, block hash verifiable on Basescan)
- AI analyst — ask questions about what's happening on-chain right now, with 1,400+ live Pyth feeds injected as context

**Live:** https://pyth-insight.vercel.app
**Code:** https://github.com/[YOUR-USERNAME]/pyth-insight

Happy to answer questions about the calibration methodology or the Entropy integration.

---

---

## 3. DEV.TO / HASHNODE POST (counts toward Best Promotional Content prize)

**Title:**
```
How I stress-tested Pyth Oracle's confidence intervals with 72+ historical snapshots — and what I found
```

**Tags:** `blockchain, defi, nextjs, typescript`

**Body:**

---

Pyth Oracle publishes a confidence interval (CI) alongside every price update. The claim: ~68% of next-price outcomes should land within that ±1σ band. I wanted to verify this empirically, so I built **Pyth Insight** — a Next.js app that fetches historical snapshots from Pyth's Hermes API and computes the actual coverage rate.

### The methodology

1. Fetch price snapshots at 60-minute intervals over 3 days (72 snapshots) using `hermes.pyth.network/v2/updates/price/{timestamp}`
2. For each consecutive pair of snapshots, check whether the actual price move landed inside the CI band, scaled by `sqrt(actualInterval / horizon)` to adjust for measurement period
3. Compute coverage at multiple sigma levels (0.5σ–3σ) and compare against theoretical normal distribution coverage
4. Score the feed: 80–100 = Well-Calibrated, 60–79 = Acceptable, 40–59 = Poor, 0–39 = Unreliable

### Key findings

BTC/USD is **systematically over-confident**: observed coverage at ±1σ is ~45% vs the expected 68.3%. At ±3σ it reaches ~89% vs the expected 99.7%. The CI is consistently too tight — a protocol relying on it for liquidation thresholds needs extra buffer.

### The Entropy game

Feed selection uses Pyth Entropy on Base mainnet. Each round's seed:

```
FNV1a("pyth-entropy:" + sequenceNumber + ":" + blockHash + ":" + minuteBucket)
```

The block hash makes the seed unpredictable before block mining — no party can manipulate which feed appears. The full derivation is shown in-app with a Basescan verification link.

**Live:** https://pyth-insight.vercel.app
**GitHub:** https://github.com/[YOUR-USERNAME]/pyth-insight

---

> **Checklist before submitting:**
> - [ ] Replace all `[YOUR-USERNAME]`, `[YOUR-DISCORD]`, `[YOUR-WALLET]`
> - [ ] Attach 2-3 screenshots to the forum post (Calibration page, Game page, AI Analyst)
> - [ ] Count Answer Capsule words (target: 40-60) ← current version is ~55 words ✓
> - [ ] Post Forum post first (required for valid submission)
> - [ ] Post Reddit OR Dev.to (at least ONE required as Content Creation)
> - [ ] Verify pyth-insight.vercel.app is live and working before submitting
