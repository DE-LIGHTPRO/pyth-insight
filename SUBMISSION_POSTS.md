# Pyth Playground Community Hackathon — Submission Posts

> **Before posting:** Replace every `[YOUR-USERNAME]` with your GitHub username,
> `[YOUR-DISCORD]` with your Discord handle, and `[YOUR-WALLET]` with your EVM wallet address.
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
An analytics platform that stress-tests Pyth's confidence intervals with real historical data, powers a provably fair prediction game using actual Pyth Entropy revelation bytes, and answers oracle questions live via an AI analyst with 1,687 live feeds as context.

### Live Demo
https://pyth-insight.vercel.app

### GitHub
https://github.com/[YOUR-USERNAME]/pyth-insight

### Which Pyth products are you using?

- **Pyth Price Feeds (Hermes)** — Live price + CI data for all ~1,687 feeds via `hermes.pyth.network/v2/updates/price/latest`, dynamically discovered at runtime — no hardcoded feed IDs
- **Pyth Hermes Historical API** — Historical price snapshots (`/v2/updates/price/{timestamp}`) used by the CI Calibration engine to fetch 72+ data points over 3–14 day windows and compare empirical vs theoretical confidence coverage
- **Pyth Entropy (Fortuna on Base)** — The Oracle Challenge game reads actual `RevealedWithCallback` events from the Entropy contract on Base via `eth_getLogs`, extracting the real 32-byte `randomNumber` that was produced by the commit-reveal protocol. These are the same bytes that appear on Basescan — fully verifiable. Contract: `0x98046Bd286715D3B0BC227Dd7a956b83D8978603`

### What does it do?

**CI Calibration Analysis** is the flagship feature. Pyth publishes a ±1σ confidence interval with every price update. In theory, 68.3% of subsequent price moves should land inside that band. Pyth Insight fetches 72+ historical snapshots from Hermes, tests that hypothesis, and renders an empirical-vs-theoretical calibration chart. Assets that are over-confident (CI too tight) or under-confident (CI too wide) are flagged with a 0–100 health score. Our live data shows BTC/USD is systematically **over-confident** — its observed coverage is 25–45% below theoretical at all sigma levels. This is directly useful for DeFi protocols using Pyth CIs as liquidation guards.

**Oracle Challenge** is a live Entropy-powered prediction game. Each round, the API reads the most recent `RevealedWithCallback` event from the Pyth Entropy contract on Base via `eth_getLogs`. The `randomNumber` field (32 bytes = `keccak256(userRandom XOR providerRandom)`) from that event is used directly as the round seed — this is the actual cryptographic output of the Fortuna provider's commit-reveal protocol. Feed index = `revelationBytes mod 12`. When real entropy bytes are obtained, the game shows a green **"✓ Real Entropy"** badge and displays the actual bytes with their revelation sequence number. Players then bet whether the next Pyth Hermes price lands inside or outside the live CI.

**AI Oracle Analyst** is a streaming chat interface (Gemini with Claude fallback) injected with the current live Pyth feed snapshot as context — ~1,687 feeds worth of live prices and CI data — so it can answer questions about what is happening on-chain right now.

**Learn** contains four educational pages covering Pyth's push-vs-pull model, confidence interval theory, Pyth Entropy commit-reveal mechanics, and the Pyth Hermes API.

### Answer Capsule

Pyth Insight uses Pyth Price Feeds (live + historical via Hermes) and Pyth Entropy (Fortuna on Base) to stress-test oracle confidence intervals against real data and power a provably fair prediction game. It reads actual RevealedWithCallback bytes from the Entropy contract on Base — the same keccak256(userRandom ⊕ providerRandom) visible on Basescan.

### Tech stack
- Next.js 15 App Router, TypeScript (strict), Tailwind CSS, Recharts
- `@pythnetwork/hermes-client` for live feeds
- Pyth Hermes REST API for live + historical price data
- Pyth Entropy: `eth_getLogs` on Base to read `RevealedWithCallback` events + Fortuna REST API fallback
- Google Gemini (dynamic model discovery via `/v1beta/models`) + Anthropic Claude (fallback AI)

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
How I read actual Pyth Entropy revelation bytes to make a provably fair game — and stress-tested Pyth's confidence intervals
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

## Using real Pyth Entropy randomness (not just reading contract state)

The Oracle Challenge game needed provably fair randomness. The naive approach is to read the provider's sequence number from the Fortuna REST API and use that as a seed. But that's just reading **contract state** — it's not actually using the cryptographic output of the commit-reveal protocol.

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

Because all fields are static types, `event.data` is always exactly 352 bytes. The `randomNumber` (the final verified random) is always the last 32 bytes. Reading it requires no ABI decoder:

```typescript
const EXPECTED_LEN = 2 + 352 * 2; // "0x" + 704 hex chars = 706

const logsRes = await fetch(BASE_RPC, {
  method: "POST",
  body: JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "eth_getLogs",
    params: [{
      address: "0x98046Bd286715D3B0BC227Dd7a956b83D8978603",
      fromBlock: `0x${(latestBlock - 500).toString(16)}`,
      toBlock: "latest",
    }],
  }),
});

const logs = (await logsRes.json()).result ?? [];

// RevealedWithCallback: 352 bytes data, 1 topic (no indexed params)
const revelationLogs = logs.filter(
  (log) => log.data?.length === EXPECTED_LEN && log.topics?.length === 1
);

// randomNumber = last 64 hex chars of event.data
const randomNumber = "0x" + revelationLogs.at(-1)?.data.slice(-64);
```

This gives you the actual bytes from a completed commit-reveal sequence — visible on Basescan, not derivable in advance by any party.

The game now shows a green **"✓ Real Entropy"** badge when real revelation bytes are found, displaying the actual 32-byte `randomNumber` with its sequence number and a link to Basescan.

## Live

- App: https://pyth-insight.vercel.app
- Code: https://github.com/[YOUR-USERNAME]/pyth-insight

---

---

## 3. GITHUB GIST — REQUIRED (Technical Contribution)

**Filename:** `pyth-entropy-revelations-eth-logs.md`

**Title:** `Reading Pyth Entropy RevealedWithCallback events via eth_getLogs — no ABI decoder needed`

**Content:**

---

# Reading Pyth Entropy RevealedWithCallback events via eth_getLogs

When building on [Pyth Entropy](https://docs.pyth.network/entropy), you don't always need to submit your own on-chain request. If you want to use recent entropy as a verifiable random seed (for games, lotteries, fair selection), you can read the `randomNumber` bytes from already-fulfilled `RevealedWithCallback` events directly from Base mainnet.

## Why this works

The `RevealedWithCallback` event on the Pyth Entropy contract has this structure:

```solidity
event RevealedWithCallback(
    Request request,        // struct: 8 static fields × 32 bytes = 256 bytes
    bytes32 userRandom,     // 32 bytes
    bytes32 providerRandom, // 32 bytes
    bytes32 randomNumber    // 32 bytes — this is the verified random output
);
```

All fields are **static types** (no `bytes`, `string`, or dynamic arrays). This means `event.data` is always exactly `11 × 32 = 352 bytes`. The `randomNumber` is always the final 32 bytes — no ABI decoder, no topic hash needed.

## Reading it with a plain JSON-RPC call

```typescript
const BASE_RPC = "https://mainnet.base.org";
const ENTROPY_CONTRACT = "0x98046Bd286715D3B0BC227Dd7a956b83D8978603";

async function getLatestPythEntropyRandom(): Promise<string | null> {
  // Step 1: get current block number
  const bnRes = await fetch(BASE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1,
      method: "eth_blockNumber", params: [],
    }),
  });
  const latestBlock = parseInt((await bnRes.json()).result, 16);

  // Step 2: get logs from the last ~500 blocks (~15 mins on Base)
  const logsRes = await fetch(BASE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 2,
      method: "eth_getLogs",
      params: [{
        address: ENTROPY_CONTRACT,
        fromBlock: `0x${(latestBlock - 500).toString(16)}`,
        toBlock: "latest",
      }],
    }),
  });
  const logs: Array<{ data: string; topics: string[] }> =
    (await logsRes.json()).result ?? [];

  // Step 3: filter for RevealedWithCallback events
  // - data = exactly 352 bytes (704 hex chars + "0x" prefix = 706 chars)
  // - topics.length = 1 (event signature hash only, no indexed params)
  const EXPECTED_LEN = 2 + 352 * 2; // 706
  const revelationLogs = logs.filter(
    (log) => log.data?.length === EXPECTED_LEN && log.topics?.length === 1
  );
  if (revelationLogs.length === 0) return null;

  // Step 4: extract randomNumber from the last 32 bytes of event.data
  // (last 64 hex chars = bytes at offset 320–351)
  const latestLog = revelationLogs[revelationLogs.length - 1];
  return "0x" + latestLog.data.slice(-64);
}

// Usage:
const randomBytes = await getLatestPythEntropyRandom();
// → "0x3a7f8c..." (32 bytes = keccak256(userRandom XOR providerRandom))
// This exact value is visible on Basescan under the contract's event log.
```

## Verifying on Basescan

The returned `randomNumber` is the `RevealedWithCallback` event's `randomNumber` field. You can verify it by going to:

```
https://basescan.org/address/0x98046Bd286715D3B0BC227Dd7a956b83D8978603#events
```

Find the most recent `RevealedWithCallback` event, decode the `data` field, and confirm the last 32 bytes match your returned value.

## Notes

- **This reads completed sequences** — the commit-reveal has already happened, so you're observing the output, not participating as a requester
- **Suitable for**: verifiable game seeds, fair selection, any case where you want provably-random bytes without submitting your own on-chain request
- **Not suitable for**: cases requiring per-user unique randomness or protection against "last-revealer" attacks — for that, use `requestWithCallback()` directly
- **Fortuna provider on Base**: `0x52DeaA1c84233F7bb8C8A45baeDE41091c616506`
- **Pyth Entropy docs**: https://docs.pyth.network/entropy

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
- Oracle Challenge game — uses actual `RevealedWithCallback` bytes from the Pyth Entropy contract on Base (not just reading a sequence number — the real keccak256(userRandom ⊕ providerRandom) from a completed commit-reveal). Green "✓ Real Entropy" badge in-game with Basescan verification link
- AI analyst — ask questions about what's happening on-chain right now, with ~1,687 live Pyth feeds injected as context

**Live:** https://pyth-insight.vercel.app
**Code:** https://github.com/[YOUR-USERNAME]/pyth-insight

Happy to answer questions about the calibration methodology or the Entropy integration.

---

---

> **Pre-submission checklist:**
> - [ ] Replace all `[YOUR-USERNAME]`, `[YOUR-DISCORD]`, `[YOUR-WALLET]`
> - [ ] Attach 3 screenshots to the forum post: Calibration page, Game page (showing "✓ Real Entropy" badge), AI Analyst
> - [ ] Count Answer Capsule words (target: 40-60) ← current version is ~57 words ✓
> - [ ] Post Forum post first (required for valid submission)
> - [ ] Post Dev.to article (required content creation — copy Section 2 above)
> - [ ] Create GitHub Gist (required technical contribution — copy Section 3 above)
> - [ ] Link both in the forum post under Content Contributions
> - [ ] Verify pyth-insight.vercel.app is live and Entropy game shows "✓ Real Entropy" badge
> - [ ] Record 2-minute demo video and add to forum post
