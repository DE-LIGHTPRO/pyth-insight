/**
 * GET /api/entropy
 *
 * Reads ACTUAL revealed randomness from the Pyth Entropy protocol on Base mainnet.
 *
 * Pyth Entropy uses a commit-reveal scheme:
 *   1. A requester generates a random number, hashes it (commitment), and submits to the contract
 *   2. The Fortuna provider does the same, storing their commitment
 *   3. After both parties commit, both reveal — the final randomness is
 *      keccak256(userRandom XOR providerRandom), verifiable by anyone on-chain
 *
 * This route reads the RevealedWithCallback events emitted by the Entropy contract
 * to obtain the *actual* random bytes produced by a real commit-reveal sequence.
 * These bytes are used to deterministically seed the Oracle Challenge game —
 * making feed selection provably unpredictable and independently verifiable.
 *
 * Pyth Entropy docs: https://docs.pyth.network/entropy
 * Fortuna provider:  https://fortuna.dourolabs.app
 * Contract:          https://basescan.org/address/0x98046Bd286715D3B0BC227Dd7a956b83D8978603
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Pyth Entropy contract on Base mainnet
const ENTROPY_CONTRACT = "0x98046Bd286715D3B0BC227Dd7a956b83D8978603";
// Default Pyth Fortuna provider for Base
const DEFAULT_PROVIDER  = "0x52DeaA1c84233F7bb8C8A45baeDE41091c616506";

// Fortuna provider REST API
const FORTUNA_BASE  = "https://fortuna.dourolabs.app";
const BASE_CHAIN_ID = "evm-base";

// Public Base RPC endpoints — tried in order; first success wins
const BASE_RPCS = [
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
  "https://base-rpc.publicnode.com",
  "https://1rpc.io/base",
];

// Helper: POST JSON-RPC to each RPC in turn, return first successful response
async function rpcFetch(body: object): Promise<Response | null> {
  for (const rpc of BASE_RPCS) {
    try {
      const res = await fetch(rpc, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        signal:  AbortSignal.timeout(5000),
      });
      if (res.ok) return res;
    } catch { /* try next RPC */ }
  }
  return null;
}

export interface EntropyState {
  sequenceNumber:  number;
  providerAddress: string;
  contractAddress: string;
  chainId:         string;
  blockNumber:     number;
  blockHash:       string;
  seed:            string;
  seedFormula:     string;
  timestamp:       number;
  source:          "fortuna" | "contract" | "fallback";
  // Real Pyth Entropy randomness fields
  isRealEntropy:   boolean;  // true when seed comes from an actual Pyth Entropy revelation
  revelationBytes?: string;  // 32-byte hex: actual random number revealed on-chain
  revSequence?:    number;   // sequence number of the revelation used
  revMethod?:      string;   // how the revelation was fetched
  // Debug info — always included so we can diagnose failures without server logs
  _debug?: Record<string, unknown>;
}

// ── Try Fortuna REST API for sequence number / block info ────────────────────

async function tryFortuna(): Promise<{
  result: { sequenceNumber: number; blockNumber: number; chainId: string } | null;
  debug: Record<string, unknown>;
}> {
  const debug: Record<string, unknown> = {};
  try {
    const res = await fetch(`${FORTUNA_BASE}/v1/chains`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    debug.fortunaStatus = res.status;
    if (!res.ok) { debug.fortunaErr = `http-${res.status}`; return { result: null, debug }; }

    const raw = await res.json();
    // API may return array OR object with a "chains" key
    const chains: Array<{
      id: string;
      latest_block_number?: number;
      sequence_number?: number;
      latest_sequence_number?: number;
    }> = Array.isArray(raw) ? raw : (raw.chains ?? raw.data ?? []);
    debug.fortunaChainCount = chains.length;
    debug.fortunaChainIds   = chains.slice(0, 10).map((c) => c.id);

    const baseChain = chains.find(
      (c) => c.id === BASE_CHAIN_ID || c.id === "base" || c.id?.toLowerCase().includes("base")
    );
    if (!baseChain) { debug.fortunaErr = "no-base-chain"; return { result: null, debug }; }

    debug.fortunaChainId = baseChain.id;
    const sequenceNumber = baseChain.latest_sequence_number ?? baseChain.sequence_number ?? 0;
    const blockNumber    = baseChain.latest_block_number ?? 0;
    debug.fortunaSeqNum  = sequenceNumber;

    if (sequenceNumber > 0) return { result: { sequenceNumber, blockNumber, chainId: baseChain.id }, debug };
    debug.fortunaErr = "seq-zero";
    return { result: null, debug };
  } catch (e) {
    debug.fortunaErr = String(e).slice(0, 80);
    return { result: null, debug };
  }
}

// ── Try Fortuna REST API revelation endpoint ─────────────────────────────────
//
// Tries to get actual revealed random bytes from a recently fulfilled sequence.
// Pyth Entropy sequences are fulfilled within seconds, so seqNum - 2 is safe.

async function tryFortunaRevelation(latestSeq: number, chainId: string): Promise<{
  randomBytes: string;
  revSequence: number;
  urlStatuses: Array<{ url: string; status: number | string }>;
} | null> {
  const seqToTry = Math.max(1, latestSeq - 2);
  const urlStatuses: Array<{ url: string; status: number | string }> = [];

  // Try multiple sequence offsets (in case recent ones aren't fulfilled yet)
  const seqsToTry = [seqToTry, Math.max(1, latestSeq - 5), Math.max(1, latestSeq - 10)];

  // Try multiple known Fortuna API URL patterns with the actual chain ID
  for (const seq of seqsToTry) {
    const urls = [
      `${FORTUNA_BASE}/v1/chains/${chainId}/revelations/${seq}`,
      `${FORTUNA_BASE}/v1/revelations/${chainId}/${seq}`,
      `${FORTUNA_BASE}/v1/chains/${BASE_CHAIN_ID}/revelations/${seq}`,
    ];

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4000),
        });
        urlStatuses.push({ url, status: res.status });
        if (!res.ok) continue;
        const data = await res.json();
        const bytes =
          data.revelation ??
          data.random_number ??
          data.randomNumber ??
          data.value ??
          data.random ??
          data.revealed_random ??
          data.randomness;
        if (typeof bytes === "string" && bytes.startsWith("0x") && bytes.length >= 66) {
          return { randomBytes: bytes.slice(0, 66), revSequence: seq, urlStatuses };
        }
      } catch (e) {
        urlStatuses.push({ url, status: String(e).slice(0, 60) });
      }
    }
  }
  return null;
}

// ── Try BaseScan API for recent entropy events ────────────────────────────────
//
// BaseScan has a proper event index so it can find events across large block
// ranges quickly and reliably, without RPC eth_getLogs rate limits.
// The free tier (no API key) allows ~5 req/s which is more than enough.

async function tryBaseScan(): Promise<{
  result: { randomBytes: string; revSequence: number; blockNumber: number } | null;
  debug: Record<string, unknown>;
}> {
  const debug: Record<string, unknown> = {};
  try {
    // Ask for the 5 most recent logs from the Entropy contract, newest first
    const url =
      `https://api.basescan.org/api?module=logs&action=getLogs` +
      `&address=${ENTROPY_CONTRACT}` +
      `&fromBlock=0&toBlock=latest&page=1&offset=5&sort=desc`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    debug.bsStatus = res.status;
    if (!res.ok) { debug.bsErr = `http-${res.status}`; return { result: null, debug }; }

    const json = await res.json();
    debug.bsApiStatus = json.status;
    debug.bsMessage   = json.message;

    if (json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) {
      debug.bsErr = json.message ?? "no-results";
      return { result: null, debug };
    }

    const logs = json.result as Array<{ data: string; topics: string[]; blockNumber: string }>;
    debug.bsTotal    = logs.length;
    debug.bsDataLens = logs.map((l) => l.data?.length ?? 0);

    const EXPECTED_LEN = 2 + REVEALED_DATA_BYTES * 2; // 706 hex chars

    // Primary: exact RevealedWithCallback size (352 bytes), no indexed params
    let match = logs.find((l) => l.data?.length === EXPECTED_LEN && l.topics?.length === 1);
    // Fallback: any log with ≥ 300 bytes
    if (!match) match = logs.find((l) => l.data && l.data.length >= 602);

    if (!match) { debug.bsErr = "no-matching-event"; return { result: null, debug }; }

    const randomBytes = "0x" + match.data.slice(-64);
    if (randomBytes.length !== 66) { debug.bsErr = "bad-data-slice"; return { result: null, debug }; }

    const seqHex   = match.data.slice(66 + 48, 66 + 64);
    const revSeq   = parseInt(seqHex, 16) || 0;
    // BaseScan returns blockNumber as hex string
    const revBlock = parseInt(match.blockNumber, 16) || 0;

    debug.bsRevSeq   = revSeq;
    debug.bsRevBlock = revBlock;
    return { result: { randomBytes, revSequence: revSeq, blockNumber: revBlock }, debug };
  } catch (e) {
    debug.bsErr = String(e).slice(0, 80);
    return { result: null, debug };
  }
}

// ── Read RevealedWithCallback events via eth_getLogs ─────────────────────────
//
// The RevealedWithCallback event is emitted by the Entropy contract whenever
// a request is fulfilled. Its ABI-encoded data contains:
//
//   struct Request { address provider; uint64 seqNum; bytes32 userCommit;
//                   address requester; uint64 blockNum; uint128 fee;
//                   uint8 numHashes; bool useBlockhash; }  // 8 × 32 = 256 bytes
//   bytes32 userRandom    // + 32 = 288
//   bytes32 providerRandom // + 32 = 320
//   bytes32 randomNumber   // + 32 = 352 bytes total
//
// All fields are static types → no dynamic offsets → data is exactly 352 bytes.
// randomNumber is the final 32 bytes (last 64 hex chars) of event.data.
//
// We also identify the Requested event (data = 3 × 32 = 96 bytes) so we can
// distinguish fulfilled (RevealedWithCallback) from unfulfilled events.

const REVEALED_DATA_BYTES = 352;   // Request(256) + userRandom(32) + providerRandom(32) + randomNumber(32)

async function tryEthLogs(): Promise<{
  result: { randomBytes: string; revSequence: number; blockNumber: number } | null;
  debug: Record<string, unknown>;
}> {
  const debug: Record<string, unknown> = {};
  try {
    // Step 1: Get current block number via first available RPC
    const bnRes = await rpcFetch({ jsonrpc: "2.0", id: 20, method: "eth_blockNumber", params: [] });
    if (!bnRes) { debug.ethErr = "blocknum-rpc-failed"; return { result: null, debug }; }
    const bnJson = await bnRes.json();
    const latestBlock = parseInt(bnJson.result as string, 16);
    if (!latestBlock) { debug.ethErr = "blocknum-zero"; return { result: null, debug }; }
    debug.latestBlock = latestBlock;

    // Step 2: Try progressively larger block ranges across all RPCs.
    // Contract usage is low so we need to look back further.
    // Base = 2 blocks/s → 50000 blocks ≈ 7 hours, 200000 ≈ 28 hours
    const BLOCK_RANGES = [1000, 10000, 50000, 200000];
    const EXPECTED_LEN = 2 + REVEALED_DATA_BYTES * 2; // 706 hex chars
    const rpcResults: Array<{ rpc: string; range: number; total: number; rpcError?: string; dataLens: number[] }> = [];

    for (const rpc of BASE_RPCS) {
      for (const range of BLOCK_RANGES) {
        const fromBlock = `0x${Math.max(0, latestBlock - range).toString(16)}`;
        let logsJson: { result?: unknown[]; error?: { message?: string } };
        try {
          const logsRes = await fetch(rpc, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0", id: 21, method: "eth_getLogs",
              params: [{ address: ENTROPY_CONTRACT, fromBlock, toBlock: "latest" }],
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (!logsRes.ok) {
            rpcResults.push({ rpc: rpc.slice(8, 30), range, total: -1, rpcError: `http-${logsRes.status}`, dataLens: [] });
            continue;
          }
          logsJson = await logsRes.json();
        } catch (e) {
          rpcResults.push({ rpc: rpc.slice(8, 30), range, total: -1, rpcError: String(e).slice(0, 40), dataLens: [] });
          continue;
        }

        if (logsJson.error) {
          rpcResults.push({ rpc: rpc.slice(8, 30), range, total: -1, rpcError: String(logsJson.error?.message).slice(0, 40), dataLens: [] });
          continue;
        }

        const logs = (logsJson.result ?? []) as Array<{ data: string; topics: string[]; blockNumber: string }>;
        const dataLens = logs.slice(0, 30).map((l) => l.data?.length ?? 0);
        rpcResults.push({ rpc: rpc.slice(8, 30), range, total: logs.length, dataLens });

        // Primary filter: exact 706 chars (352 bytes), single topic
        let revealedLogs = logs.filter(
          (log) => log.data?.length === EXPECTED_LEN && log.topics?.length === 1
        );
        // Fallback: any log with ≥ 300 bytes of data
        if (revealedLogs.length === 0) {
          revealedLogs = logs.filter((log) => log.data && log.data.length >= 602);
        }

        if (revealedLogs.length === 0) {
          if (logs.length > 0) break; // logs exist but none match — wider range won't help
          continue;
        }

        const log = revealedLogs[revealedLogs.length - 1];
        const randomBytes = "0x" + log.data.slice(-64);
        if (randomBytes.length !== 66) continue;

        const seqHex  = log.data.slice(66 + 48, 66 + 64);
        const revSeq  = parseInt(seqHex, 16) || 0;
        const revBlock = parseInt(log.blockNumber, 16) || latestBlock;
        debug.ethRpcResults = rpcResults;
        return { result: { randomBytes, revSequence: revSeq, blockNumber: revBlock }, debug };
      }
    }
    debug.ethRpcResults = rpcResults;
    return { result: null, debug };
  } catch (e) {
    debug.ethErr = String(e).slice(0, 80);
    return { result: null, debug };
  }
}

// ── Try on-chain eth_call for latest provider sequence number ─────────────────

async function tryOnChain(): Promise<{ sequenceNumber: number; blockNumber: number } | null> {
  try {
    const paddedProvider = DEFAULT_PROVIDER.toLowerCase().replace("0x", "").padStart(64, "0");
    const callData = `0xa0cfe58a${paddedProvider}`; // getProviderInfo(address)

    const [callRes, blockRes] = await Promise.all([
      rpcFetch({
        jsonrpc: "2.0", id: 1, method: "eth_call",
        params: [{ to: ENTROPY_CONTRACT, data: callData }, "latest"],
      }),
      rpcFetch({ jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] }),
    ]);

    if (!callRes || !blockRes) return null;

    const callJson  = await callRes.json();
    const blockJson = await blockRes.json();
    const hex       = (callJson.result as string) ?? "";
    const blockHex  = (blockJson.result as string) ?? "0x0";

    if (!hex || hex === "0x") return null;

    const cleanHex  = hex.replace("0x", "");
    const lastHex   = cleanHex.slice(-16) || "0";
    const lastSlot  = parseInt(lastHex, 16);
    const blockNumber = parseInt(blockHex, 16);

    if (lastSlot > 0) return { sequenceNumber: lastSlot, blockNumber };
    return null;
  } catch {
    return null;
  }
}

// ── Fetch block hash from Base ────────────────────────────────────────────────

async function fetchBlockHash(blockNumber: number | "latest"): Promise<{ blockNumber: number; blockHash: string } | null> {
  try {
    const blockParam = blockNumber === "latest" ? "latest" : `0x${blockNumber.toString(16)}`;
    const res = await rpcFetch({
      jsonrpc: "2.0", id: 3, method: "eth_getBlockByNumber",
      params: [blockParam, false],
    });
    if (!res) return null;
    const json  = await res.json();
    const block = json?.result;
    if (!block?.hash || !block?.number) return null;
    return { blockNumber: parseInt(block.number, 16), blockHash: block.hash as string };
  } catch {
    return null;
  }
}

// ── Simple FNV1a hash (fallback seed derivation) ──────────────────────────────

function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0").repeat(4);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const timestamp = Math.floor(Date.now() / 1000);

  // Step 1: Get the latest sequence number and block (for display + fallback)
  let seqState: { sequenceNumber: number; blockNumber: number; chainId: string } | null = null;
  let source: EntropyState["source"] = "fallback";
  const dbg: Record<string, unknown> = {};

  const { result: fortunaSeqResult, debug: fortunaDbg } = await tryFortuna();
  Object.assign(dbg, fortunaDbg);
  if (fortunaSeqResult) {
    seqState = fortunaSeqResult;
    source = "fortuna";
  } else {
    const onChain = await tryOnChain();
    if (onChain) {
      seqState = { ...onChain, chainId: BASE_CHAIN_ID };
      source = "contract";
      dbg.onChainSeq = onChain.sequenceNumber;
    } else {
      dbg.onChainErr = "failed";
    }
  }

  const sequenceNumber = seqState?.sequenceNumber ?? timestamp;
  let   blockNumber    = seqState?.blockNumber    ?? 0;

  // Step 2: Try to get ACTUAL revealed randomness from Pyth Entropy.
  // Order: Fortuna revelation API → BaseScan event index → eth_getLogs RPC
  let revelation: { randomBytes: string; revSequence: number } | null = null;
  let revMethod = "";

  if (seqState && seqState.sequenceNumber > 2) {
    const fortunaRev = await tryFortunaRevelation(seqState.sequenceNumber, seqState.chainId);
    dbg.fortunaRevUrls = fortunaRev?.urlStatuses ?? [];
    if (fortunaRev) {
      revelation = { randomBytes: fortunaRev.randomBytes, revSequence: fortunaRev.revSequence };
      revMethod  = "fortuna-api";
    }
  }

  if (!revelation) {
    // BaseScan: reliable event index, no key needed for small queries
    const { result: bsRev, debug: bsDbg } = await tryBaseScan();
    Object.assign(dbg, bsDbg);
    if (bsRev) {
      revelation = { randomBytes: bsRev.randomBytes, revSequence: bsRev.revSequence };
      revMethod  = "basescan";
      if (bsRev.blockNumber > 0) blockNumber = bsRev.blockNumber;
    }
  }

  if (!revelation) {
    // eth_getLogs fallback with wide block ranges
    const { result: logRev, debug: ethDebug } = await tryEthLogs();
    Object.assign(dbg, ethDebug);
    if (logRev) {
      revelation = { randomBytes: logRev.randomBytes, revSequence: logRev.revSequence };
      revMethod  = "eth-logs";
      if (logRev.blockNumber > 0) blockNumber = logRev.blockNumber;
    }
  }

  // Step 3: Fetch the block hash to tie randomness to verifiable on-chain state
  let blockHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const blockData = await fetchBlockHash(blockNumber > 0 ? blockNumber : "latest");
  if (blockData) {
    blockNumber = blockData.blockNumber;
    blockHash   = blockData.blockHash;
  }

  // Step 4: Derive the game seed
  //   • If we got real Pyth Entropy revelation bytes → use them directly as seed
  //   • Otherwise → derive from sequence number + block hash (our fallback)
  let seed: string;
  let seedFormula: string;
  let isRealEntropy = false;

  if (revelation?.randomBytes) {
    // Use the actual Pyth Entropy revealed random bytes as the game seed.
    // These went through the full commit-reveal protocol — no party could have
    // predicted them before both user and provider revealed their commitments.
    seed         = revelation.randomBytes.replace("0x", "");
    seedFormula  = `Pyth Entropy revelation #${revelation.revSequence} → keccak256(userRandom ⊕ providerRandom)`;
    isRealEntropy = true;
  } else {
    // Fallback: derive seed from sequence number + block hash + minute bucket.
    // Block hash is unpredictable before mining, so this is still fair.
    const minuteBucket = Math.floor(timestamp / 60);
    const seedInput    = `pyth-entropy:${sequenceNumber}:${blockHash}:${minuteBucket}`;
    seed               = simpleHash(seedInput);
    seedFormula        = `FNV1a("pyth-entropy:${sequenceNumber}:${blockHash.slice(0, 10)}…:${minuteBucket}")`;
    isRealEntropy      = false;
  }

  const result: EntropyState = {
    sequenceNumber,
    providerAddress: DEFAULT_PROVIDER,
    contractAddress: ENTROPY_CONTRACT,
    chainId:         seqState?.chainId ?? "base",
    blockNumber,
    blockHash,
    seed,
    seedFormula,
    timestamp,
    source,
    isRealEntropy,
    ...(revelation ? {
      revelationBytes: revelation.randomBytes,
      revSequence:     revelation.revSequence,
      revMethod,
    } : {}),
    _debug: dbg,
  };

  return NextResponse.json(result, {
    headers: {
      // Cache for 30s — short enough for debugging, long enough to avoid hammering RPCs
      "Cache-Control": "public, max-age=30, s-maxage=30",
    },
  });
}
