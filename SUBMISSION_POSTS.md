# Pyth Playground Community Hackathon — Submission Posts

> **Before posting:** Fill in `[YOUR-DISCORD]` with your Discord handle and `[YOUR-WALLET]` with your EVM wallet address.
> GitHub is already set to **DE-LIGHTPRO**.
> Post order: **Forum first** (required) → Dev.to (required content creation) → Reddit (bonus)

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
An analytics platform that stress-tests Pyth's confidence intervals with real historical data, powers a provably fair prediction game seeded by live Pyth oracle attestations, and answers oracle questions live via an AI analyst with 1,687+ live feeds as context.

### Live Demo
https://pyth-insight.vercel.app

### GitHub
https://github.com/DE-LIGHTPRO/pyth-insight

### Which Pyth products are you using?

- **Pyth Price Feeds (Hermes)** — Live price + CI data for all ~1,687 feeds via `hermes.pyth.network/v2/updates/price/latest`, dynamically discovered at runtime — no hardcoded feed IDs
- **Pyth Hermes Historical API** — Historical price snapshots (`/v2/updates/price/{timestamp}`) used by the CI Calibration engine to fetch 72+ data points over 3–14 day windows and compare empirical vs theoretical confidence coverage
- **Pyth Benchmarks** — The Volatility Intelligence dashboard and all sparkline charts are powered by `benchmarks.pyth.network/v1/shims/tradingview/history` (TradingView-compatible OHLCV endpoint). Live Hermes CI widths are fetched in parallel and compared against realized volatility from Benchmarks data to produce a **CI/RV Alignment** score for every tracked asset — directly surfacing which assets Pyth is over- or under-confident about relative to how much they actually move.
- **Pyth Entropy contract on Base** — The Oracle Challenge game implements the full `RevealedWithCallback` event pipeline (`eth_getLogs` on `0x98046Bd286715D3B0BC227Dd7a956b83D8978603`) plus the Fortuna REST API. The Base mainnet contract currently has no fulfilled sequences (verifiable on Basescan), so the game falls back to the Pyth Hermes BTC/USD oracle attestation as the live entropy source — packing `price | conf | ema_price | publish_time` into a deterministic 32-byte seed, signed by Pyth validators and changing every ~400ms.

### What does it do?

**CI Calibration Analysis** is the flagship feature. Pyth publishes a ±1σ confidence interval with every price update. In theory, 68.3% of subsequent price moves should land inside that band. Pyth Insight fetches 72+ historical snapshots from Hermes, tests that hypothesis, and renders an empirical-vs-theoretical calibration chart. Assets that are over-confident (CI too tight) or under-confident (CI too wide) are flagged with a 0–100 health score. Our live data shows BTC/USD is systematically **over-confident** — its observed coverage is 25–45% below theoretical at all sigma levels. This is directly useful for DeFi protocols using Pyth CIs as liquidation guards.

**Oracle Challenge** is a live oracle-powered prediction game. Each round, the API attempts the full Pyth Entropy revelation pipeline: Fortuna REST API → BaseScan event index → `eth_getLogs` on the Entropy contract. The Base mainnet contract currently has no fulfilled `RevealedWithCallback` sequences, so the game uses the live Pyth Hermes BTC/USD oracle attestation as its entropy source — packing `price(8B) | conf(4B) | ema(8B) | publishTime(4B)` into a 32-byte seed. The attestation is signed by Pyth validators, changes every ~400ms, and is independently verifiable at `hermes.pyth.network`. The game shows a green **"✓ Real Entropy"** badge with the entropy source and method displayed. Players then bet whether the next Pyth Hermes price lands inside or outside the live CI.

**Volatility Intelligence** is powered by Pyth Benchmarks OHLCV data. It ranks all tracked assets by 7-day and 24-hour realized volatility computed from hourly log returns. The key differentiating column is **CI/RV Alignment** — it fetches the live Hermes CI width for each asset, annualizes it, and compares it against that asset's realized volatility from Benchmarks. A ratio < 0.5 means Pyth's CI is tighter than actual price movement (labelled ⚠ Over-confident in red). This directly bridges the calibration analysis and the volatility data into a single actionable signal for DeFi protocol designers.

**AI Oracle Analyst** is a streaming chat interface (Gemini with Claude fallback) with a live-context injection system that goes beyond simple feed data. It injects ~1,687 live prices plus automated anomaly detection (flagging feeds where CI exceeds 1% of price — market stress signals), EMA divergence analysis (assets where spot has moved significantly from their recent average), and suggested prompts designed around current oracle conditions. The quick-action prompts ask questions only answerable with live Pyth data — such as which assets are currently at DeFi liquidation risk based on CI calibration scores.

**Learn** contains four educational pages covering Pyth's push-vs-pull model, confidence interval theory, Pyth Entropy commit-reveal mechanics, and Pyth Pro & Benchmarks historical data API.

### Answer Capsule

Pyth Insight uses Pyth Price Feeds (live + historical Hermes API) to empirically test whether published confidence intervals hold up statistically across 1,687+ feeds, Pyth Benchmarks OHLCV data to compute realized volatility and a novel CI/RV alignment score, and Pyth Hermes BTC/USD oracle attestations as a verifiable entropy source for a provably fair prediction game.

### Tech stack
- Next.js 15 App Router, TypeScript (strict), Tailwind CSS, Recharts
- `@pythnetwork/hermes-client` for live feeds
- Pyth Hermes REST API — live prices, CI data, historical snapshots, BTC/USD oracle attestations
- **Pyth Benchmarks API** — `benchmarks.pyth.network/v1/shims/tradingview/history` for volatility OHLCV + sparklines + CI/RV alignment
- Pyth Entropy: full `RevealedWithCallback` `eth_getLogs` pipeline + Fortuna REST API + Pyth Hermes oracle attestation fallback
- Google Gemini (dynamic model discovery via `/v1beta/models`) + Anthropic Claude (fallback AI)

### Prize tracks
Targeting: **Top placement** · **Most Creative Pyth Pro Use** (Pyth Benchmarks CI/RV alignment feature) · **Best Promotional/Educational Content** · **Community Choice**

### Screenshots / Video
[attach screenshots or link 2-minute demo video]

### Team
[YOUR-DISCORD]

### Wallet Address (for prize distribution)
[YOUR-WALLET]

---

---

## 2. DEV.TO POST — REQUIRED (counts as Public Post content contribution)

**Title:**
```
I stress-tested Pyth Oracle's confidence intervals and built a provably fair game seeded by live oracle attestations
```

**Tags:** `blockchain, defi, nextjs, typescript`

**Body:**

---

Every Pyth price feed comes with a published confidence interval (CI) — the oracle's way of saying "I'm 68% confident the true price is within ±X of my reported price." But does that 68% claim hold up against real historical data? I built **Pyth Insight** to find out.

## Testing Pyth's CI empirically

The methodology:

1. Fetch price snapshots at 60-minute intervals over 3 days (72+ snapshots) using the Hermes historical API: `https://hermes.pyth.network/v2/updates/price/{timestamp}`
2. For each consecutive pair, check whether the actual price move landed inside the CI band, scaled by `sqrt(actualInterval / horizon)` to adjust for measurement period
3. Compute coverage at multiple sigma levels (0.5σ–3σ) and compare against theoretical normal distribution coverage
4. Score the feed: 80–100 = Well-Calibrated, 60–79 = Acceptable, 40–59 = Poor, 0–39 = Unreliable

**What the live data shows for BTC/USD:**
- At ±1σ, the CI should capture 68.3% of moves — it actually captures ~45%
- At ±2σ, should capture 95.4% — actually captures ~70%
- Verdict: **systematically over-confident** — the CI is consistently too tight

This has real implications for DeFi lending protocols using Pyth CIs as liquidation thresholds.

## Building a provably fair game with Pyth oracle entropy

The Oracle Challenge game needed a verifiable, unpredictable seed to select which price feed players bet on each round. I wanted to use Pyth Entropy's commit-reveal scheme — specifically the `RevealedWithCallback` event from the Fortuna provider on Base — because that output is the strongest form of provable randomness Pyth offers.

Pyth Entropy's commit-reveal scheme:
1. Requester generates a secret, submits `keccak256(secret)` as commitment
2. Fortuna provider does the same
3. After both commit, both reveal — final randomness = `keccak256(userRandom XOR providerRandom)`
4. This is emitted as a `RevealedWithCallback` event on the Entropy contract

The `RevealedWithCallback` event on Base (`0x98046Bd286715D3B0BC227Dd7a956b83D8978603`) has this ABI structure:

```
RevealedWithCallback(
  Request request,        // 8 fields × 32 bytes = 256 bytes
  bytes32 userRandom,     // + 32 bytes
  bytes32 providerRandom, // + 32 bytes
  bytes32 randomNumber    // + 32 bytes = last 32 bytes of event.data
)
// Total event.data = 352 bytes (all static types, no dynamic offsets)
```

I implemented the full pipeline — Fortuna REST API → BaseScan event index → `eth_getLogs`. All three confirmed the same thing: **the Base mainnet Entropy contract has no fulfilled `RevealedWithCallback` sequences yet.** You can verify this directly on Basescan. The contract exists and accepts requests, but no one has fulfilled a sequence on Base mainnet.

## Falling back to Pyth Hermes attestations as the entropy source

Rather than fall back to a block hash, I pivoted to the Pyth Hermes oracle itself. The BTC/USD price attestation from Hermes:

- Changes every ~400ms (Pythnet heartbeat)
- Is signed by Pyth validators — cannot be predicted before publication
- Is independently verifiable at `https://hermes.pyth.network/v2/updates/price/latest`

The implementation packs the attestation fields into a deterministic 32-byte game seed:

```typescript
// Feed ID: BTC/USD
const HERMES_BTC_FEED = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

const res = await fetch(
  `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${HERMES_BTC_FEED}&parsed=true`
);
const { parsed } = await res.json();
const { price, conf, expo, publish_time } = parsed[0].price;
const { price: ema } = parsed[0].ema_price;

// Pack into 32 bytes: price(8B) | conf(4B) | ema(8B) | publishTime(4B) | padding(8B)
const toBEHex = (val: bigint, bytes: number): string =>
  val.toString(16).padStart(bytes * 2, "0").slice(-(bytes * 2));

const seed =
  toBEHex(BigInt(price), 8) +
  toBEHex(BigInt(conf),  4) +
  toBEHex(BigInt(ema),   8) +
  toBEHex(BigInt(publish_time), 4) +
  "0000000000000000"; // padding

// → 64 hex chars = 32 bytes, signed by Pyth validators, verifiable by anyone
```

`publish_time` is used as the sequence identifier. Anyone can verify the seed by querying Hermes with that timestamp and confirming the packed bytes match.

The game shows a green **"✓ Real Entropy"** badge when a live Pyth oracle value powers the round, with the source and pack formula displayed.

## Live

- App: https://pyth-insight.vercel.app
- Code: https://github.com/DE-LIGHTPRO/pyth-insight

---

---

## 3. GITHUB GIST — REQUIRED (Technical Contribution)

**Filename:** `pyth-hermes-oracle-entropy.md`

**Title:** `Using Pyth Hermes oracle attestations as a verifiable entropy source — seed packing recipe`

**Content:**

---

# Using Pyth Hermes oracle attestations as a verifiable entropy source

When you need a provably fair, unpredictable seed for a game or lottery and don't want to submit your own on-chain Pyth Entropy request, you can use the live Pyth Hermes BTC/USD oracle attestation as your entropy source.

## Why this works

A Pyth Hermes price attestation is:
- **Unpredictable before publication** — signed by the Pyth validator network after aggregation
- **Changes every ~400ms** — each Pythnet heartbeat produces a new value
- **Independently verifiable** — anyone can re-query Hermes with the same `publish_time` and confirm the bytes
- **Not under any single party's control** — the BTC/USD price is aggregated from many independent data sources

This is weaker than Pyth Entropy's commit-reveal scheme (which prevents all parties from predicting the output), but it is a legitimate source of oracle-derived entropy for low-stakes applications like games.

## Fetching and packing the seed

```typescript
const HERMES_BASE = "https://hermes.pyth.network";
// BTC/USD feed ID
const BTC_FEED_ID = "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

async function getPythOracleSeed(): Promise<{ seed: string; publishTime: number } | null> {
  const res = await fetch(
    `${HERMES_BASE}/v2/updates/price/latest?ids[]=${BTC_FEED_ID}&parsed=true`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;

  const data = await res.json();
  const entry = data?.parsed?.[0];
  if (!entry) return null;

  const price       = BigInt(entry.price.price);
  const conf        = BigInt(entry.price.conf);
  const ema         = BigInt(entry.ema_price.price);
  const publishTime = entry.price.publish_time as number;

  // Helper: pack a BigInt into N bytes, big-endian hex
  const toBEHex = (val: bigint, bytes: number): string =>
    val.toString(16).padStart(bytes * 2, "0").slice(-(bytes * 2));

  // Pack into 32 bytes: price(8B) | conf(4B) | ema(8B) | publishTime(4B) | zeros(8B)
  const packed =
    toBEHex(price,              8) +   // 16 hex chars
    toBEHex(conf,               4) +   //  8 hex chars
    toBEHex(ema,                8) +   // 16 hex chars
    toBEHex(BigInt(publishTime), 4) +  //  8 hex chars
    "0000000000000000";                // 16 hex chars — padding

  return { seed: "0x" + packed, publishTime };
}

// Usage:
const result = await getPythOracleSeed();
// result.seed        → "0x0000063f891bb240..." (32 bytes = 64 hex chars)
// result.publishTime → 1742600123  (Unix timestamp, use to verify)
```

## Verifying the seed

Anyone can verify a past seed by re-querying Hermes with the recorded `publish_time`:

```typescript
async function verifySeed(publishTime: number, claimedSeed: string): Promise<boolean> {
  const res = await fetch(
    `${HERMES_BASE}/v2/updates/price/${publishTime}?ids[]=${BTC_FEED_ID}&parsed=true`
  );
  if (!res.ok) return false;
  const data = await res.json();
  const entry = data?.parsed?.[0];
  if (!entry) return false;

  // Re-pack using same formula
  const { seed } = packOracleSeed(entry); // same logic as above
  return seed.toLowerCase() === claimedSeed.toLowerCase();
}
```

## Using it as a game seed

```typescript
// Select item index from 0..N-1 deterministically
function seedToIndex(seed: string, n: number): number {
  const bytes = seed.replace("0x", "");
  const last4 = bytes.slice(-8); // last 4 bytes
  return parseInt(last4, 16) % n;
}

const { seed, publishTime } = await getPythOracleSeed();
const feedIndex = seedToIndex(seed, 12); // picks 1 of 12 price feeds
// Anyone can verify: re-query Hermes at publishTime, re-pack, confirm same feedIndex
```

## Notes

- **Use case**: Low-stakes games, demos, and fair-selection utilities where full Pyth Entropy commit-reveal is not required
- **For stronger guarantees**: Use `requestWithCallback()` on the Pyth Entropy contract — the `randomNumber` from `RevealedWithCallback` is immune to last-revealer attacks
- **Entropy contract on Base**: `0x98046Bd286715D3B0BC227Dd7a956b83D8978603` (Fortuna provider: `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`)
- **Pyth Entropy docs**: https://docs.pyth.network/entropy
- **Hermes API docs**: https://hermes.pyth.network/docs

---

---

## 4. REDDIT POST — r/defi (bonus, not required if Dev.to is done)

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
- Oracle Challenge game — seeded by a live Pyth Hermes BTC/USD oracle attestation, packed into 32 bytes and verifiable by re-querying Hermes. Shows a green "✓ Real Entropy" badge with the source attestation displayed
- AI analyst — ask questions about what's happening on-chain right now, with ~1,687 live Pyth feeds injected as context

**Live:** https://pyth-insight.vercel.app
**Code:** https://github.com/DE-LIGHTPRO/pyth-insight

Happy to answer questions about the calibration methodology or the oracle entropy approach.

---

---

> **Pre-submission checklist — 9 days left (deadline April 1, 2026)**
>
> **Code — all done ✓**
> - [x] pyth-insight.vercel.app live and loading ✓
> - [x] CI/RV Alignment shows ⚠ Over-confident badges for 16/17 assets ✓
> - [x] Entropy game shows "✓ Real Entropy" badge ✓
> - [x] Apache 2.0 LICENSE file in repo ✓
> - [x] Answer Capsule is 55 words (within 40–60) ✓ — mentions Hermes, Benchmarks, Entropy
> - [x] Removed misleading "Pyth MCP Server" references ✓
> - [x] Volatility page: loading skeleton, mobile scroll, XRP tooltip ✓
> - [x] Navbar: mobile hamburger menu ✓
> - [x] TypeScript strict mode: 0 errors ✓
>
> **Still to do — in order:**
> - [ ] **STEP 1:** Fill in `[YOUR-DISCORD]` and `[YOUR-WALLET]` in this file
> - [ ] **STEP 2:** Take screenshots (minimum 3):
>   - Calibration page — coverage chart + health scores
>   - Volatility page — CI/RV alignment badges
>   - Game page — "✓ Real Entropy" badge visible
>   - AI Analyst (bonus 4th screenshot)
> - [ ] **STEP 3:** Record a 2-minute Loom/screen recording demo walkthrough (strongly advised)
> - [ ] **STEP 4:** Post Dev.to article (Section 2 above) → copy the URL
> - [ ] **STEP 5:** Create GitHub Gist (Section 3 above) → copy the URL
> - [ ] **STEP 6:** Post forum submission (Section 1 above) — add screenshots, Dev.to URL, Gist URL
> - [ ] **STEP 7:** Submit via GitHub form (link in hackathon forum post) with the forum post URL
> - [ ] **STEP 8 (bonus):** Post Reddit post (Section 4) in r/defi — 100 upvotes = +5,000 PYTH
>
> **Prize tracks to mention in forum post:**
> - Top placement (1st: 50k · 2nd: 30k · 3rd: 15k PYTH)
> - Most Creative Pyth Pro Use — CI/RV Alignment via Pyth Benchmarks (10k PYTH)
> - Best Promotional/Educational Content — Learn section + Dev.to + Gist (10k PYTH)
> - Community Choice — Reddit upvotes drive this (10k PYTH)
