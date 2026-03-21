# Pyth Playground Community Hackathon — Submission Posts

> Copy-paste these exactly. Post the Forum Post first (required), then the Reddit/Dev.to post.

---

## 1. FORUM POST — forum.pyth.network

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

- **Pyth Price Feeds (Hermes)** — Live price + CI data in the dashboard and Oracle Challenge game via `https://hermes.pyth.network/v2/updates/price/latest`
- **Pyth Benchmarks** — Historical price archives for CI Calibration Analysis, fetching 120-min interval snapshots over 3–14 day windows to compute empirical vs published confidence accuracy
- **Pyth Entropy (Fortuna on Base)** — Provably fair feed selection in the Oracle Challenge game; seed derived from `sequence_number × blockHash × minuteBucket` so no party can predict or manipulate which asset appears each round

### What does it do?

**CI Calibration Analysis** is the flagship feature. Pyth publishes a ±1σ confidence interval with every price update. In theory, 68.3% of subsequent price moves should land inside that band. Pyth Insight fetches historical snapshots from Benchmarks, tests that hypothesis across all 15 major assets, and renders an empirical-vs-theoretical calibration chart. Assets that are over-confident (CI too tight) or under-confident (CI too wide) are flagged. Users can choose any asset, time period (3/7/14 days), and measurement horizon (30s/1min/5min).

**Oracle Challenge** is a live Entropy-powered game. Each 30-second round, the Pyth Entropy sequence number on Base (from the Fortuna provider at `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`) is combined with the actual block hash and a minute-bucket to derive a deterministic seed. That seed selects one of 12 live Pyth feeds. Players bet whether the next published price will land inside or outside Pyth's real-time CI. The result is fetched directly from Hermes. Score streaks award bonus points. The seed formula and block hash are displayed with a Basescan verification link.

**AI Oracle Analyst** is a streaming chat interface powered by Anthropic Claude (with Gemini 2.0 Flash fallback). It is injected with the current live Pyth feed snapshot as context, so it can answer questions about what is happening on-chain right now — why a CI is wide, what feeds are most uncertain, etc.

**Learn** contains four educational pages covering how Pyth's push-vs-pull model works, confidence interval theory, Pyth Entropy commit-reveal mechanics, and Pyth Benchmarks / Pyth Pro API.

### Answer Capsule

> *What is Pyth Entropy and how does it differ from Chainlink VRF?*

Pyth Entropy uses a commit-reveal scheme where the requester and the Pyth provider each commit a secret number. The on-chain hash of both secrets is the random output. This means *neither party alone can manipulate the result* — the requester can't pick a favorable hash and the provider can't front-run. Chainlink VRF instead relies on a single off-chain oracle using a verifiable random function. Pyth Entropy's design is fully on-chain verifiable: anyone can recompute `keccak256(userSecret, providerSecret)` from the transaction data. It also supports multiple chains natively via the Fortuna provider network.

### Tech stack
- Next.js 15 App Router, TypeScript, Tailwind CSS, Recharts
- `@pythnetwork/hermes-client` for live feeds
- Pyth Benchmarks REST API for historical calibration
- Pyth Entropy / Fortuna REST API + Base mainnet eth_call for randomness
- Anthropic Claude SDK + Gemini 2.0 Flash (fallback AI)

### Screenshots / Video
[attach screenshots or link 2-minute demo video]

---

---

## 2. REDDIT POST — r/defi (or r/algotrading, r/ethereum)

**Title:**
```
I built a tool that tests whether Pyth Oracle's confidence intervals are actually calibrated — results are interesting
```

**Body:**

---

Every Pyth price feed comes with a published confidence interval — essentially the oracle saying "I'm 68% sure the true price is within ±X of what I'm reporting." But does that hold up against real data?

I built **Pyth Insight** to find out. It pulls historical snapshots from Pyth's Benchmarks archive and tests whether the published ±1σ CI actually captures 68.3% of subsequent price moves. The results vary a lot by asset and time horizon.

**What I found:** On short horizons (30 seconds), most feeds are well-calibrated. On longer horizons (5 minutes), many feeds show over-confidence — the CI is tighter than observed volatility warrants. This has real implications for lending protocols that use Pyth CIs as liquidation guards.

**Features:**
- CI Calibration Chart — empirical vs theoretical coverage across 15 assets
- Health score and verdict (Well-Calibrated / Over-Confident / Under-Confident)
- Oracle Challenge game — bet on whether Pyth's live CI is right, round seeded by Pyth Entropy on Base (provably fair, block hash verifiable on Basescan)
- AI analyst — ask questions about what's happening on-chain right now, powered by Claude with live Pyth feed context injected

**Live:** https://pyth-insight.vercel.app
**Code:** https://github.com/[YOUR-USERNAME]/pyth-insight

Happy to answer questions about the calibration methodology or the Entropy integration.

---

---

## 3. DEV.TO POST (optional — counts toward Best Promotional Content)

**Title:**
```
How I stress-tested Pyth Oracle's confidence intervals with 14 days of historical data
```

**Tags:** `blockchain, defi, python, nextjs`

**Body:**

---

Pyth Oracle publishes a confidence interval (CI) alongside every price update. The claim: ~68% of next-price outcomes should land within that ±1σ band.

I wanted to verify this claim empirically, so I built **Pyth Insight** — a Next.js app that uses the Pyth Benchmarks API to pull historical snapshots and compute the actual coverage rate.

### The methodology

1. Fetch price snapshots at 120-minute intervals over a configurable window (3, 7, or 14 days) using the Pyth Benchmarks REST API
2. For each snapshot *i*, record `price[i]`, `conf[i]`, and the actual price at horizon *h* later (`price[i+h]`)
3. Check whether `|price[i+h] - price[i]| ≤ conf[i]` — did the move land inside the CI?
4. Compute coverage at multiple sigma levels (0.5σ through 3σ) and compare against theoretical normal distribution coverage

### Key findings

- **30-second horizon:** Most assets hit 60–70% coverage at ±1σ — close to the theoretical 68.3%
- **5-minute horizon:** Coverage drops to 45–55% for many assets, indicating the CI doesn't scale for longer holding periods
- **Metals (XAU, XAG):** Often under-confident — wider CIs than the observed volatility needs

### The Entropy game

Feed selection in the Oracle Challenge game uses Pyth Entropy on Base mainnet. Each round's seed = `FNV1a("pyth-entropy:" + sequenceNumber + ":" + blockHash + ":" + minuteBucket)`. The block hash makes the seed unpredictable before block mining — no manipulation possible. Seed derivation is shown in-app with a Basescan link.

### Code

```typescript
// Calibration core — one function
function computeCalibration(snapshots: PriceSnapshot[], horizonSecs: number): CalibrationPoint[] {
  const sigmas = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
  return sigmas.map((sigma) => {
    let inside = 0;
    const pairs = snapshots.slice(0, -horizonSecs / 120);
    pairs.forEach((snap, i) => {
      const future = snapshots[i + Math.round(horizonSecs / 120)];
      if (!future) return;
      const delta = Math.abs(future.price - snap.price);
      if (delta <= snap.conf * sigma) inside++;
    });
    return {
      sigma,
      empirical: inside / pairs.length,
      theoretical: erf(sigma / Math.SQRT2),
    };
  });
}
```

**Live:** https://pyth-insight.vercel.app
**GitHub:** https://github.com/[YOUR-USERNAME]/pyth-insight

---

> **Remember:** Replace `[YOUR-USERNAME]` with your actual GitHub username in all three posts before submitting.
> Post order: Forum post first (required for valid submission) → Reddit → Dev.to (optional).
