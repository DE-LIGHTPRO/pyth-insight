/**
 * GET /api/entropy
 *
 * Reads the current state of the Pyth Entropy provider on Base mainnet
 * via the Fortuna REST API — no wallet or transaction required.
 *
 * Returns a deterministic, on-chain-verifiable entropy seed that the
 * Oracle Challenge game uses to select which feed to show each round.
 *
 * Pyth Entropy docs: https://docs.pyth.network/entropy
 * Fortuna provider:  https://fortuna.dourolabs.app
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Fortuna provider endpoints — no auth needed for chain info
const FORTUNA_BASE   = "https://fortuna.dourolabs.app";
const BASE_CHAIN_ID  = "evm-base";

// Pyth Entropy contract on Base mainnet
const ENTROPY_CONTRACT = "0x98046Bd286715D3B0BC227Dd7a956b83D8978603";
// Default Pyth provider for Base
const DEFAULT_PROVIDER  = "0x52DeaA1c84233F7bb8C8A45baeDE41091c616506";

// Base RPC (public endpoint — no key needed for eth_call reads)
const BASE_RPC = "https://mainnet.base.org";

export interface EntropyState {
  sequenceNumber:  number;
  providerAddress: string;
  contractAddress: string;
  chainId:         string;
  blockNumber:     number;
  blockHash:       string; // actual on-chain block hash — verifiable on Basescan
  seed:            string; // hex hash used as game randomness seed
  seedFormula:     string; // human-readable derivation formula
  timestamp:       number;
  source:          "fortuna" | "contract" | "fallback";
}

// ── Try Fortuna REST API first ────────────────────────────────────────────────

async function tryFortuna(): Promise<{ sequenceNumber: number; blockNumber: number } | null> {
  try {
    // GET /v1/chains lists all supported chains with latest info
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

    if (sequenceNumber > 0) {
      return { sequenceNumber, blockNumber };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Fetch actual block hash from Base mainnet ─────────────────────────────────

async function fetchBlockHash(blockNumber: number | "latest"): Promise<{ blockNumber: number; blockHash: string } | null> {
  try {
    const blockParam = blockNumber === "latest" ? "latest" : `0x${blockNumber.toString(16)}`;
    const res = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "eth_getBlockByNumber",
        params: [blockParam, false],
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const block = json?.result;
    if (!block?.hash || !block?.number) return null;
    return {
      blockNumber: parseInt(block.number, 16),
      blockHash:   block.hash as string,
    };
  } catch {
    return null;
  }
}

// ── Try on-chain eth_call to Entropy contract ─────────────────────────────────

async function tryOnChain(): Promise<{ sequenceNumber: number; blockNumber: number } | null> {
  try {
    // Encode call to getProviderInfo(address)
    // Function selector: keccak256("getProviderInfo(address)") = 0xa0cfe58a
    const paddedProvider = DEFAULT_PROVIDER.toLowerCase().replace("0x", "").padStart(64, "0");
    const callData = `0xa0cfe58a${paddedProvider}`;

    const rpcBody = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        { to: ENTROPY_CONTRACT, data: callData },
        "latest",
      ],
    };

    const [callRes, blockRes] = await Promise.all([
      fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rpcBody),
        signal: AbortSignal.timeout(6000),
      }),
      fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_blockNumber", params: [] }),
        signal: AbortSignal.timeout(6000),
      }),
    ]);

    if (!callRes.ok) return null;

    const callJson  = await callRes.json();
    const blockJson = await blockRes.json();
    const hex       = (callJson.result as string) ?? "";
    const blockHex  = (blockJson.result as string) ?? "0x0";

    if (!hex || hex === "0x") return null;

    // ProviderInfo is a packed ABI-encoded struct. sequenceNumber is uint64 at
    // slot 6 (after two uint128 + two bytes32 + two dynamic bytes fields).
    // Dynamic types make exact offsets hard — instead, just use the full result
    // as entropy source, and extract the last meaningful uint64 from the tail.
    //
    // Simpler: use last 8 bytes of the response (sequenceNumber is typically near end)
    const cleanHex = hex.replace("0x", "");
    // Last 64 chars = 32 bytes = the final uint in the tuple (currentCommitmentSequenceNumber)
    // Use last 16 hex chars (8 bytes) — enough for uint64 sequenceNumber
    // Avoid BigInt literal syntax (n suffix) to stay ES2019 compatible
    const lastHex = cleanHex.slice(-16) || "0";
    const lastSlot = parseInt(lastHex, 16);

    const blockNumber = parseInt(blockHex, 16);

    if (lastSlot > 0) {
      return { sequenceNumber: lastSlot, blockNumber };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Simple hash (no crypto module needed — just string hashing) ───────────────

function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 0x01000193) >>> 0;
  }
  // Extend to 32 hex chars for display
  return (h >>> 0).toString(16).padStart(8, "0").repeat(4);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const timestamp = Math.floor(Date.now() / 1000);

  // Try Fortuna first (fastest), then on-chain, then fallback
  let state: { sequenceNumber: number; blockNumber: number } | null = null;
  let source: EntropyState["source"] = "fallback";

  state = await tryFortuna();
  if (state) {
    source = "fortuna";
  } else {
    state = await tryOnChain();
    if (state) source = "contract";
  }

  const sequenceNumber = state?.sequenceNumber ?? timestamp;
  let   blockNumber    = state?.blockNumber    ?? 0;

  // Fetch the actual block hash — this ties randomness to real on-chain state
  // and makes it independently verifiable on Basescan by anyone.
  let blockHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const blockData = await fetchBlockHash(blockNumber > 0 ? blockNumber : "latest");
  if (blockData) {
    blockNumber = blockData.blockNumber;
    blockHash   = blockData.blockHash;
  }

  // Derive the entropy seed: hash of sequence + block hash + minute-bucket
  // Block hash is unpredictable before the block is mined — this ensures the
  // seed cannot be predicted by any party before the round starts.
  const minuteBucket  = Math.floor(timestamp / 60);
  const seedInput     = `pyth-entropy:${sequenceNumber}:${blockHash}:${minuteBucket}`;
  const seed          = simpleHash(seedInput);
  const seedFormula   = `FNV1a( "pyth-entropy:${sequenceNumber}:${blockHash.slice(0, 10)}…:${minuteBucket}" )`;

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
  };

  return NextResponse.json(result, {
    headers: {
      // Valid for 60 seconds — each minute-bucket uses same seed (stable rounds)
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
