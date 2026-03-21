"use client";

/**
 * Oracle Challenge — Pyth Entropy-powered prediction game
 *
 * Pyth features:
 *   • Pyth Price Feeds (Hermes) — live prices + CI
 *   • Pyth Entropy (Fortuna)   — verifiable on-chain randomness for feed selection
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { EntropyState } from "@/app/api/entropy/route";

const ROUND_DURATION = 30;
const HISTORY_MAX    = 10;

const FEED_POOL = [
  { symbol: "BTC/USD",  id: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", type: "crypto" },
  { symbol: "ETH/USD",  id: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", type: "crypto" },
  { symbol: "SOL/USD",  id: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", type: "crypto" },
  { symbol: "BNB/USD",  id: "2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f", type: "crypto" },
  { symbol: "LINK/USD", id: "8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221", type: "crypto" },
  { symbol: "AVAX/USD", id: "93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7", type: "crypto" },
  { symbol: "ARB/USD",  id: "3fa4252848f9f0a1480be62745a4629d9eb1322aebab8a791e344b3b9c1adcf5", type: "crypto" },
  { symbol: "DOGE/USD", id: "dcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c", type: "crypto" },
  { symbol: "EUR/USD",  id: "a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b", type: "fx"     },
  { symbol: "GBP/USD",  id: "84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1", type: "fx"     },
  { symbol: "XAU/USD",  id: "765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2", type: "metal"  },
  { symbol: "XAG/USD",  id: "f2fb02c32b055c805e7238d628e5e9dadef274376114eb1f012337cabe93871e", type: "metal"  },
];

type Phase      = "loading" | "betting" | "waiting" | "result" | "error";
type Prediction = "inside"  | "outside";

interface LivePrice {
  price: number; conf: number; expo: number; publishTime: number;
}

interface RoundResult {
  roundNum: number; symbol: string; prediction: Prediction;
  openPrice: number; closePrice: number; conf: number;
  correct: boolean; delta: number; pointsGained: number;
}

function seedToIndex(seed: string, length: number, offset: number = 0): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h + offset * 2654435761) % length;
}

function fmt(n: number): string {
  if (n >= 10000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 100)   return n.toFixed(3);
  if (n >= 1)     return n.toFixed(4);
  return n.toFixed(6);
}

function fmtConf(conf: number, price: number): string {
  return `±${price > 0 ? ((conf / price) * 100).toFixed(3) : "0.000"}%`;
}

async function fetchPrice(feedId: string): Promise<LivePrice | null> {
  try {
    const res  = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${feedId}&parsed=true`);
    if (!res.ok) return null;
    const data = await res.json();
    const p    = data?.parsed?.[0]?.price;
    if (!p) return null;
    const expo = parseInt(p.expo, 10);
    const mul  = Math.pow(10, expo);
    return { price: parseFloat(p.price) * mul, conf: parseFloat(p.conf) * mul, expo, publishTime: parseInt(p.publish_time, 10) };
  } catch { return null; }
}

function Ring({ seconds, total }: { seconds: number; total: number }) {
  const pct   = seconds / total;
  const r     = 28;
  const circ  = 2 * Math.PI * r;
  const color = pct > 0.5 ? "#a855f7" : pct > 0.25 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-16 h-16">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.25s linear, stroke 0.5s" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-bold text-lg tabular-nums">{seconds}</span>
      </div>
    </div>
  );
}

export default function GamePage() {
  const [phase,      setPhase]      = useState<Phase>("loading");
  const [entropy,    setEntropy]    = useState<EntropyState | null>(null);
  const [roundNum,   setRoundNum]   = useState(1);
  const [feed,       setFeed]       = useState<typeof FEED_POOL[0] | null>(null);
  const [openPrice,  setOpenPrice]  = useState<LivePrice | null>(null);
  const [closePrice, setClosePrice] = useState<LivePrice | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [countdown,  setCountdown]  = useState(ROUND_DURATION);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [history,    setHistory]    = useState<RoundResult[]>([]);
  const [score,      setScore]      = useState(0);
  const [streak,     setStreak]     = useState(0);
  const [error,      setError]      = useState<string | null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasStarted = useRef(false);
  const streakRef  = useRef(0);
  useEffect(() => { streakRef.current = streak; }, [streak]);

  const fetchEnt = useCallback(async (): Promise<EntropyState | null> => {
    try { const r = await fetch("/api/entropy"); return r.ok ? (await r.json()) as EntropyState : null; }
    catch { return null; }
  }, []);

  const revealRound = useCallback(async (open: LivePrice, chosen: typeof FEED_POOL[0], round: number, pred: Prediction) => {
    timerRef.current && clearInterval(timerRef.current);
    setPhase("waiting");
    let close: LivePrice | null = null;
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      const f = await fetchPrice(chosen.id);
      if (f && f.publishTime > open.publishTime) { close = f; break; }
      close = f;
    }
    if (!close) close = open;
    setClosePrice(close);
    const delta   = Math.abs(close.price - open.price);
    const isIn    = delta <= open.conf;
    const correct = (pred === "inside") === isIn;
    const bonus   = correct ? Math.floor(streakRef.current / 3) * 5 : 0;
    const pts     = correct ? 10 + bonus : -5;
    const result: RoundResult = { roundNum: round, symbol: chosen.symbol, prediction: pred,
      openPrice: open.price, closePrice: close.price, conf: open.conf, correct, delta, pointsGained: pts };
    setLastResult(result);
    setScore((s) => Math.max(0, s + pts));
    setStreak((s) => correct ? s + 1 : 0);
    setHistory((h) => [result, ...h].slice(0, HISTORY_MAX));
    setPhase("result");
  }, []);

  const startRound = useCallback(async (round: number, prev: EntropyState | null) => {
    setPhase("loading"); setClosePrice(null); setPrediction(null); setCountdown(ROUND_DURATION); setLastResult(null);
    const ent = await fetchEnt();
    const ae  = ent ?? prev ?? { sequenceNumber: Date.now(), providerAddress: "fallback",
      contractAddress: "0x98046Bd286715D3B0BC227Dd7a956b83D8978603", chainId: "base",
      blockNumber: 0, seed: Date.now().toString(16), timestamp: Math.floor(Date.now() / 1000), source: "fallback" as const };
    setEntropy(ae);
    const chosen = FEED_POOL[seedToIndex(ae.seed, FEED_POOL.length, round) % FEED_POOL.length];
    setFeed(chosen);
    const open = await fetchPrice(chosen.id);
    if (!open) { setError(`Cannot fetch ${chosen.symbol} from Pyth Hermes.`); setPhase("error"); return; }
    setOpenPrice(open); setPhase("betting");
    timerRef.current && clearInterval(timerRef.current);
    let t = ROUND_DURATION;
    timerRef.current = setInterval(() => {
      t -= 1; setCountdown(t);
      if (t <= 0) {
        timerRef.current && clearInterval(timerRef.current);
        setPrediction((prev2) => { const p = prev2 ?? "inside"; revealRound(open, chosen, round, p); return p; });
      }
    }, 1000);
  }, [fetchEnt, revealRound]);

  const placeBet = useCallback((pred: Prediction) => {
    if (phase !== "betting" || prediction !== null) return;
    setPrediction(pred);
    timerRef.current && clearInterval(timerRef.current);
    if (openPrice && feed && entropy) revealRound(openPrice, feed, roundNum, pred);
  }, [phase, prediction, openPrice, feed, entropy, roundNum, revealRound]);

  const nextRound = useCallback(() => { const n = roundNum + 1; setRoundNum(n); startRound(n, entropy); }, [roundNum, entropy, startRound]);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startRound(1, null);
    return () => { timerRef.current && clearInterval(timerRef.current); };
  }, []); // eslint-disable-line

  const tb: Record<string, string> = {
    crypto: "bg-purple-950 text-purple-400 border-purple-800",
    fx:     "bg-sky-950 text-sky-400 border-sky-800",
    metal:  "bg-yellow-950 text-yellow-400 border-yellow-800",
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-pink-400 font-medium tracking-wide uppercase">Oracle Challenge</span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />Pyth Entropy · Base
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Can you beat the oracle?</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            Pyth Entropy seeds each round. Predict whether the next price lands{" "}
            <span className="text-emerald-400 font-medium">inside</span> or{" "}
            <span className="text-red-400 font-medium">outside</span> Pyth&apos;s live confidence interval.
          </p>
        </div>
        <div className="flex gap-6 rounded-xl border border-white/8 bg-[rgb(17,17,25)] px-5 py-3">
          {[{ v: score, l: "Score", c: "text-purple-400" }, { v: streak, l: "Streak", c: streak >= 3 ? "text-amber-400" : "text-white" }, { v: `#${roundNum}`, l: "Round", c: "text-white" }].map((x) => (
            <div key={x.l} className="flex flex-col items-center gap-0.5">
              <div className={`text-xl font-bold tabular-nums ${x.c}`}>{x.v}</div>
              <div className="text-xs text-slate-500">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading */}
      {phase === "loading" && (
        <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-medium">Seeding from Pyth Entropy…</p>
          <p className="text-slate-500 text-sm">Reading Base mainnet entropy provider</p>
        </div>
      )}

      {/* Error */}
      {phase === "error" && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-8 text-center flex flex-col items-center gap-4">
          <p className="text-red-300 font-medium">{error}</p>
          <button onClick={() => startRound(roundNum, entropy)} className="px-5 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold transition">
            Try again
          </button>
        </div>
      )}

      {/* Active round */}
      {(phase === "betting" || phase === "waiting") && openPrice && feed && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${tb[feed.type] ?? "bg-white/5 text-slate-400 border-white/10"}`}>{feed.type.toUpperCase()}</span>
                  <span className="flex items-center gap-1 text-xs text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</span>
                </div>
                <div className="text-3xl font-black text-white tabular-nums tracking-tight">${fmt(openPrice.price)}</div>
                <div className="text-sm text-slate-400 mt-0.5">{feed.symbol}</div>
              </div>
              {phase === "betting"
                ? <Ring seconds={countdown} total={ROUND_DURATION} />
                : <div className="w-16 h-16 flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
              }
            </div>
            <div className="rounded-lg border border-white/6 bg-white/3 px-4 py-3">
              <div className="text-xs text-slate-500 mb-1">Pyth Confidence Interval</div>
              <div className="flex items-center gap-3">
                <div className="text-white font-mono text-sm font-semibold">
                  ${fmt(openPrice.price - openPrice.conf)} — ${fmt(openPrice.price + openPrice.conf)}
                </div>
                <span className="text-xs text-slate-500 font-mono">{fmtConf(openPrice.conf, openPrice.price)}</span>
              </div>
            </div>
            <p className="mt-4 text-center text-slate-300 text-sm">Will the next <strong className="text-white">{feed.symbol}</strong> price land inside this CI?</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["inside", "outside"] as Prediction[]).map((p) => (
              <button key={p} onClick={() => placeBet(p)} disabled={phase === "waiting" || prediction !== null}
                className={`rounded-xl border p-5 text-left transition-all duration-150 ${
                  prediction === p ? (p === "inside" ? "bg-emerald-950/60 border-emerald-600" : "bg-red-950/60 border-red-600")
                  : (phase === "waiting" || prediction !== null) ? "bg-[rgb(17,17,25)] border-white/5 opacity-50 cursor-not-allowed"
                  : (p === "inside" ? "bg-[rgb(17,17,25)] border-white/8 hover:border-emerald-700/50 hover:bg-emerald-950/20 cursor-pointer"
                                    : "bg-[rgb(17,17,25)] border-white/8 hover:border-red-700/50 hover:bg-red-950/20 cursor-pointer")}`}
              >
                <div className={`text-sm font-bold mb-1 ${p === "inside" ? "text-emerald-400" : "text-red-400"}`}>
                  {p === "inside" ? "✓ INSIDE CI" : "✗ OUTSIDE CI"}
                </div>
                <p className="text-xs text-slate-500">
                  {p === "inside" ? "Price stays within Pyth's CI — normal conditions." : "Price breaks the CI — volatility spike."}
                </p>
              </button>
            ))}
          </div>
          {phase === "waiting" && <p className="text-center text-slate-500 text-sm animate-pulse">Fetching result from Pyth Hermes…</p>}
        </div>
      )}

      {/* Result */}
      {phase === "result" && lastResult && closePrice && openPrice && feed && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-6 ${lastResult.correct ? "bg-emerald-950/20 border-emerald-700/50" : "bg-red-950/20 border-red-700/50"}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lastResult.correct ? "bg-emerald-500/20 border border-emerald-500/40" : "bg-red-500/20 border border-red-500/40"}`}>
                {lastResult.correct
                  ? <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  : <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
              </div>
              <div>
                <div className={`font-bold ${lastResult.correct ? "text-emerald-400" : "text-red-400"}`}>
                  {lastResult.correct ? `Correct! +${lastResult.pointsGained} pts` : `Wrong — ${lastResult.pointsGained} pts`}
                </div>
                {streak > 1 && lastResult.correct && <div className="text-xs text-amber-400">{streak}-round streak!</div>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Opening", value: `$${fmt(openPrice.price)}`, cls: "text-white" },
                { label: "CI width", value: fmtConf(openPrice.conf, openPrice.price), cls: "text-purple-400" },
                { label: "Closing",  value: `$${fmt(closePrice.price)}`, cls: lastResult.correct ? "text-emerald-400" : "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-white/4 px-3 py-2.5 text-center">
                  <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                  <div className={`font-mono text-sm ${s.cls}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white/4 px-4 py-2 text-center text-xs text-slate-400">
              Move <span className="text-white font-mono">${fmt(lastResult.delta)}</span>
              {" vs CI "}
              <span className="text-purple-400 font-mono">±${fmt(openPrice.conf)}</span>
              {" → "}
              <span className={lastResult.delta <= openPrice.conf ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                {lastResult.delta <= openPrice.conf ? "inside" : "outside"} the band
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={nextRound} className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
              Next round →
            </button>
            <button onClick={() => { setScore(0); setStreak(0); setHistory([]); setRoundNum(1); startRound(1, entropy); }}
              className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/8 text-slate-400 hover:text-white font-medium text-sm transition">
              Restart
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/8 bg-[rgb(17,17,25)] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/6 text-xs font-semibold text-slate-400 uppercase tracking-wide">History</div>
          <div className="divide-y divide-white/4">
            {history.map((r) => (
              <div key={r.roundNum} className="flex items-center gap-4 px-5 py-3">
                <span className="text-xs text-slate-600 w-6">#{r.roundNum}</span>
                <span className="text-xs text-slate-400 font-mono w-20">{r.symbol}</span>
                <span className={`text-xs font-medium ${r.correct ? "text-emerald-400" : "text-red-400"}`}>{r.correct ? "✓" : "✗"}</span>
                <span className="text-xs text-slate-500 ml-auto">{r.prediction === "inside" ? "Bet INSIDE" : "Bet OUTSIDE"} → <span className={r.delta <= r.conf ? "text-emerald-400" : "text-red-400"}>{r.delta <= r.conf ? "inside" : "outside"}</span></span>
                <span className={`text-xs font-mono w-10 text-right ${r.correct ? "text-emerald-400" : "text-red-400"}`}>{r.pointsGained > 0 ? "+" : ""}{r.pointsGained}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entropy provenance */}
      {entropy && (
        <div className="mt-6 rounded-xl border border-pink-900/30 bg-pink-950/10 p-4">
          <div className="text-xs text-slate-400 leading-relaxed">
            <span className="text-pink-300 font-medium">Provably fair — Pyth Entropy on Base: </span>
            Feed selection seeded by sequence #{entropy.sequenceNumber.toLocaleString()} from the Fortuna provider.{" "}
            Seed: <code className="text-pink-300 font-mono text-[10px]">{entropy.seed.slice(0, 16)}…</code>
            {" · "}Source: <span className="text-white">{entropy.source}</span>
            {" · "}Contract:{" "}
            <a href={`https://basescan.org/address/${entropy.contractAddress}`} target="_blank" rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
              {entropy.contractAddress.slice(0, 8)}…{entropy.contractAddress.slice(-6)}
            </a>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">How it works</div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { n:"1", c:"text-pink-400",    t:"Entropy seeds selection",   d:"Pyth Entropy's sequence number on Base deterministically picks which of 12 feeds to show each round — verifiable on-chain." },
            { n:"2", c:"text-purple-400",  t:"You see the live CI",       d:"Pyth publishes a real-time confidence interval with every price update. A wider CI = more oracle uncertainty in that moment." },
            { n:"3", c:"text-emerald-400", t:"Oracle decides the outcome", d:"After your bet, the next published Pyth Hermes price determines if the move was inside or outside the confidence interval." },
          ].map((s) => (
            <div key={s.n} className="flex gap-3">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold ${s.c}`}>{s.n}</div>
              <div>
                <div className={`text-xs font-semibold mb-1 ${s.c}`}>{s.t}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
