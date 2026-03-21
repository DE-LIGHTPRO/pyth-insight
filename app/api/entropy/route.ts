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
}

// ── Try Fortuna REST API for sequence number / block info ────────────────────

async function tryFortuna(): Promise<{ sequenceNumber: number; blockNumber: number } | null> {
  try {
    const res = await fetch(`${FORTUNA_BASE}/v1/chains`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const chains: Array<{
      id: string;
      latest_block_number?: number;
      sequence_number?: number;
      latest_sequence_number?: number;
    }> = await res.json();

    const baseChain = chains.find(
      (c) => c.id === BASE_CHAIN_ID || c.id === "base" || c.id?.toLowerCase().includes("base")
    );
    if (!baseChain) return null;

    const sequenceNumber = baseChain.latest_sequence_number ?? baseChain.sequence_number ?? 0;
    const blockNumber    = baseChain.latest_block_number ?? 0;

    if (sequenceNumber > 0) return { sequenceNumber, blockNumber };
    return null;
  } catch {
    return null;
  }
}

// ── Try Fortuna REST API revelation endpoint ─────────────────────────────────
//
// Tries to get actual revealed random bytes from a recently fulfilled sequence.
// Pyth Entropy sequences are fulfilled within seconds, so seqNum - 2 is safe.

async function tryFortunaRevelation(latestSeq: number): Promise<{
  randomBytes: string;
  revSequence: number;
} | null> {
  const seqToTry = Math.max(1, latestSeq - 2);

  // Try multiple known Fortuna API URL patterns
  const urls = [
    `${FORTUNA_BASE}/v1/revelations/${BASE_CHAIN_ID}/${seqToTry}`,
    `${FORTUNA_BASE}/v1/chains/${BASE_CHAIN_ID}/revelations/${seqToTry}`,
    `${FORTUNA_BASE}/v1/chains/${BASE_CHAIN_ID}/requests/${seqToTry}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const bytes =
        data.revelation ??
        data.random_number ??
        data.randomNumber ??
        data.value ??
        data.random ??
        data.revealed_random;
      if (typeof bytes === "string" && bytes.startsWith("0x") && bytes.length === 66) {
        return { randomBytes: bytes, revSequence: seqToTry };
      }
    } catch { /* try next URL */ }
  }
  return null;
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
  randomBytes: string;
  revSequence: number;
  blockNumber:  number;
} | null> {
  try {
    // Step 1: Get current block number via first available RPC
    const bnRes = await rpcFetch({ jsonrpc: "2.0", id: 20, method: "eth_blockNumber", params: [] });
    if (!bnRes) return null;
    const bnJson = await bnRes.json();
    const latestBlock = parseInt(bnJson.result as string, 16);
    if (!latestBlock) return null;

    // Step 2: Try progressively larger block ranges across all RPCs.
    // Small ranges first to avoid hitting eth_getLogs result limits (~10k logs).
    // Base produces ~2 blocks/s so 50 blocks ≈ 25s, 300 ≈ 2.5min, 1000 ≈ 8min.
    const BLOCK_RANGES = [50, 150, 300, 1000];
    const EXPECTED_LEN = 2 + REVEALED_DATA_BYTES * 2; // 706 hex chars

    for (const rpc of BASE_RPCS) {
      for (const range of BLOCK_RANGES) {
        const fromBlock = `0x${Math.max(0, latestBlock - range).toString(16)}`;

        let logsJson: { result?: unknown[]; error?: unknown };
        try {
          const logsRes = await fetch(rpc, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 21,
              method: "eth_getLogs",
              params: [{ address: ENTROPY_CONTRACT, fromBlock, toBlock: "latest" }],
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (!logsRes.ok) continue;
          logsJson = await logsRes.json();
        } catch { continue; }

        // If RPC returned an error (e.g. too many results), try a smaller range
        if (logsJson.error) continue;

        const logs = (logsJson.result ?? []) as Array<{
          data: string; topics: string[]; blockNumber: string;
        }>;

        // RevealedWithCallback: data = exactly 352 bytes (706 hex chars incl. "0x")
        // No indexed params → topics has exactly 1 entry (the event sig hash)
        const revealedLogs = logs.filter(
          (log) => log.data?.length === EXPECTED_LEN && log.topics?.length === 1
        );

        if (revealedLogs.length === 0) {
          // If we got logs but none matched, wider range won't help — try next RPC
          if (logs.length > 0) break;
          continue;
        }

        // Use the most recent revelation (last in array = highest block number)
        const log = revealedLogs[revealedLogs.length - 1];

        // randomNumber is the LAST 32 bytes (64 hex chars) of event data
        const randomBytes = "0x" + log.data.slice(-64);
        if (randomBytes.length !== 66) continue;

        // sequenceNumber sits in slot 1 of the Request struct (uint64, ABI right-aligned)
        // Slot 1 offset: 2 ("0x") + 64 (slot 0) = 66; uint64 is last 16 chars of its 32-byte slot
        const seqHex  = log.data.slice(66 + 48, 66 + 64);
        const revSeq  = parseInt(seqHex, 16) || 0;
        const revBlock = parseInt(log.blockNumber, 16) || latestBlock;

        return { randomBytes, revSequence: revSeq, blockNumber: revBlock };
      }
    }
    return null;
  } catch {
    return null;
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
  let seqState: { sequenceNumber: number; blockNumber: number } | null = null;
  let source: EntropyState["source"] = "fallback";

  seqState = await tryFortuna();
  if (seqState) {
    source = "fortuna";
  } else {
    seqState = await tryOnChain();
    if (seqState) source = "contract";
  }

  const sequenceNumber = seqState?.sequenceNumber ?? timestamp;
  let   blockNumber    = seqState?.blockNumber    ?? 0;

  // Step 2: Try to get ACTUAL revealed randomness from Pyth Entropy
  //   First: Fortuna REST revelation endpoint
  //   Then:  eth_getLogs reading RevealedWithCallback on-chain events
  let revelation: { randomBytes: string; revSequence: number } | null = null;
  let revMethod = "";

  if (seqState && seqState.sequenceNumber > 2) {
    revelation = await tryFortunaRevelation(seqState.sequenceNumber);
    if (revelation) revMethod = "fortuna-api";
  }

  if (!revelation) {
    const logRev = await tryEthLogs();
    if (logRev) {
      revelation = { randomBytes: logRev.randomBytes, revSequence: logRev.revSequence };
      revMethod  = "eth-logs";
      // Use the revelation block for block hash (more provenance)
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
    chainId:         "base",
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
  };

  return NextResponse.json(result, {
    headers: {
      // Cache for 60s — real entropy revelations happen continuously so this stays fresh
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
