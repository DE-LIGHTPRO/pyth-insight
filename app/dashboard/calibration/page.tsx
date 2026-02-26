"use client";

import { useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { CalibrationResult } from "@/lib/pyth/benchmarks";

// ── Asset + period options ────────────────────────────────────────────────────

const ASSETS = [
  "BTC/USD", "ETH/USD", "SOL/USD", "BNB/USD", "AVAX/USD",
  "ARB/USD", "OP/USD",  "LINK/USD", "UNI/USD", "AAVE/USD",
];

const PERIODS = [
  { label: "3 days",  value: 3  },
  { label: "7 days",  value: 7  },
  { label: "14 days", value: 14 },
];

const HORIZON_OPTIONS = [
  { label: "30 s",  value: 30  },
  { label: "1 min", value: 60  },
  { label: "5 min", value: 300 },
];

// ── Verdict styling ───────────────────────────────────────────────────────────

const VERDICT_STYLE = {
  excellent: { pill: "bg-emerald-950 text-emerald-400 border-emerald-700", ring: "ring-emerald-500/30", score: "text-emerald-400" },
  good:      { pill: "bg-sky-950 text-sky-400 border-sky-700",             ring: "ring-sky-500/30",     score: "text-sky-400"     },
  fair:      { pill: "bg-amber-950 text-amber-400 border-amber-700",       ring: "ring-amber-500/30",   score: "text-amber-400"   },
  poor:      { pill: "bg-red-950 text-red-400 border-red-700",             ring: "ring-red-500/30",     score: "text-red-400"     },
} as const;

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CalibTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const expected = payload.find((p) => p.name === "Expected");
  const observed = payload.find((p) => p.name === "Observed");
  const delta    = observed && expected ? ((observed.value - expected.value) * 100).toFixed(1) : null;

  return (
    <div className="rounded-lg border border-white/10 bg-[rgb(14,14,22)] px-4 py-3 shadow-xl text-sm">
      <div className="font-semibold text-white mb-1">±{label}σ interval</div>
      {expected && (
        <div className="flex gap-2 items-center text-slate-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-500 inline-block" />
          Expected: <span className="text-white font-mono">{(expected.value * 100).toFixed(1)}%</span>
        </div>
      )}
      {observed && (
        <div className="flex gap-2 items-center mt-0.5 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
          Observed: <span className="text-white font-mono">{(observed.value * 100).toFixed(1)}%</span>
        </div>
      )}
      {delta !== null && (
        <div className={`mt-1.5 text-xs font-medium ${
          Math.abs(parseFloat(delta)) < 2
            ? "text-emerald-400"
            : parseFloat(delta) < 0
            ? "text-red-400"
            : "text-amber-400"
        }`}>
          {parseFloat(delta) > 0 ? "+" : ""}{delta}pp deviation
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type CalibData = CalibrationResult & { sampleSize: number };

export default function CalibrationPage() {
  const [asset,   setAsset]   = useState("BTC/USD");
  const [days,    setDays]    = useState(7);
  const [horizon, setHorizon] = useState(60);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<CalibData | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [ranOnce, setRanOnce] = useState(false);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        symbol:  asset,
        days:    String(days),
        horizon: String(horizon),
      });
      const res  = await fetch(`/api/calibration?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
        setResult(null);
      } else {
        setResult(data as CalibData);
        setRanOnce(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error — check connection");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [asset, days, horizon]);

  // ── Chart data ──────────────────────────────────────────────────────────────

  const chartData = result?.points.map((p) => ({
    name:     p.k.toFixed(1),
    Expected: parseFloat(p.expected.toFixed(4)),
    Observed: parseFloat(p.observed.toFixed(4)),
    delta:    p.observed - p.expected,
    n:        p.sampleSize,
  })) ?? [];

  const vStyle = result ? VERDICT_STYLE[result.verdict] : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-purple-400 font-medium tracking-wide uppercase">
              Oracle Intelligence
            </span>
            <span className="text-xs text-slate-600">via Pyth Benchmarks</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CI Calibration Analysis</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            Measures how accurately Pyth&apos;s confidence intervals predict actual price moves.
            A perfectly calibrated oracle&apos;s ±1σ band should capture 68.3% of future prices —
            deviations reveal systematic over- or under-confidence.
          </p>
        </div>
        <a
          href="https://benchmarks.pyth.network"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors mt-1"
        >
          Pyth Benchmarks API →
        </a>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5 mb-6">
        <div className="flex flex-wrap gap-6 items-end">

          {/* Asset selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">Asset</label>
            <div className="flex flex-wrap gap-1.5">
              {ASSETS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => setAsset(sym)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    asset === sym
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/50"
                      : "bg-white/5 text-slate-400 hover:bg-white/8 hover:text-slate-300"
                  }`}
                >
                  {sym.split("/")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">Period</label>
            <div className="flex gap-1.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setDays(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    days === p.value
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/50"
                      : "bg-white/5 text-slate-400 hover:bg-white/8 hover:text-slate-300"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horizon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500 font-medium">Price horizon</label>
            <div className="flex gap-1.5">
              {HORIZON_OPTIONS.map((h) => (
                <button
                  key={h.value}
                  onClick={() => setHorizon(h.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    horizon === h.value
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/50"
                      : "bg-white/5 text-slate-400 hover:bg-white/8 hover:text-slate-300"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="ml-auto px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:text-purple-500 text-white text-sm font-semibold transition-all duration-150 shadow-md shadow-purple-900/50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                Analysing…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="7" cy="7" r="5" />
                  <path d="M7 4v3l2 1.5" strokeLinecap="round" />
                </svg>
                {ranOnce ? "Re-run" : "Run Analysis"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Loading skeleton ──────────────────────────────────────────────── */}
      {loading && (
        <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-8 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium">Fetching historical Benchmarks data…</p>
            <p className="text-slate-500 text-sm text-center max-w-sm">
              Sampling {asset} price + CI snapshots every 60 min over {days} days
              from <code className="text-slate-400">benchmarks.pyth.network</code>
            </p>
          </div>
          <div className="w-full max-w-md bg-white/5 rounded-full h-1 overflow-hidden mt-2">
            <div className="h-full bg-purple-500 rounded-full animate-pulse w-2/3" />
          </div>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {error && !loading && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" />
          </svg>
          <div>
            <p className="text-red-300 font-medium text-sm">Analysis failed</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
            <p className="text-slate-500 text-xs mt-2">
              The Pyth Benchmarks API may be rate-limited or temporarily unavailable.
              Try a shorter period or wait a moment before retrying.
            </p>
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !error && !result && (
        <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center mb-1">
            <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v4l3 1.5" strokeLinecap="round" />
              <path d="M3 3l18 18" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold">Ready to analyse</p>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">
              Select an asset, time period, and horizon above, then click{" "}
              <span className="text-slate-400 font-medium">Run Analysis</span>.
            </p>
          </div>
          <div className="mt-2 text-xs text-slate-600 max-w-sm leading-relaxed">
            Data is fetched live from <code className="text-slate-500">benchmarks.pyth.network</code> —
            the first public calibration measurement of the Pyth oracle.
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result && !loading && (
        <>
          {/* Score + stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">

            {/* Health score */}
            <div className={`col-span-2 sm:col-span-1 rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5 flex flex-col items-center justify-center ring-1 ${vStyle?.ring}`}>
              <div className={`text-5xl font-black tabular-nums ${vStyle?.score}`}>
                {result.healthScore}
              </div>
              <div className="text-xs text-slate-500 mt-1">Calibration Score</div>
              <div className={`mt-2 text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${vStyle?.pill}`}>
                {result.verdict}
              </div>
            </div>

            {/* Stat cards */}
            {[
              { label: "Asset",         value: result.symbol   },
              { label: "Sample size",   value: `${result.sampleSize} snapshots` },
              { label: "Period",        value: `${result.samplePeriodDays} days · ${horizon}s horizon` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 flex flex-col justify-center">
                <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                <div className="text-white font-semibold text-sm">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-white">Capture Rate by Sigma Multiple</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  How often the actual price move fell within ±kσ of the CI
                </div>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-3 rounded-sm bg-slate-600 inline-block" /> Expected (normal dist)
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" /> Observed (Pyth)
                </span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                barCategoryGap="25%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickFormatter={(v) => `±${v}σ`}
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<CalibTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.05)" />
                <Bar dataKey="Expected" name="Expected" fill="#475569" radius={[3, 3, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Observed" name="Observed" radius={[3, 3, 0, 0]} maxBarSize={32}>
                  {chartData.map((entry, idx) => {
                    const dev = Math.abs(entry.delta);
                    const color =
                      dev < 0.03 ? "#a855f7" :   // tight: purple
                      dev < 0.06 ? "#f59e0b" :   // moderate: amber
                                   "#ef4444";    // wide: red
                    return <Cell key={idx} fill={color} />;
                  })}
                </Bar>
                <Legend
                  wrapperStyle={{ display: "none" }} /* hidden — we use custom legend above */
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sigma table */}
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] overflow-hidden mb-5">
            <div className="px-5 py-3.5 border-b border-white/6">
              <span className="text-sm font-semibold text-white">Detailed Results</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  {["Sigma", "Expected", "Observed", "Deviation", "Samples", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium px-5 py-2.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.points.map((p, i) => {
                  const dev    = p.observed - p.expected;
                  const absDev = Math.abs(dev);
                  const devStr = `${dev >= 0 ? "+" : ""}${(dev * 100).toFixed(2)}pp`;
                  const status =
                    absDev < 0.02 ? { label: "Accurate",         cls: "text-emerald-400" } :
                    absDev < 0.05 ? { label: "Slight deviation", cls: "text-amber-400"   } :
                    dev < 0       ? { label: "Over-confident",   cls: "text-red-400"     } :
                                    { label: "Under-confident",  cls: "text-orange-400"  };
                  return (
                    <tr
                      key={i}
                      className="border-b border-white/4 hover:bg-white/2 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-white font-medium">±{p.k.toFixed(1)}σ</td>
                      <td className="px-5 py-3 font-mono text-slate-400">{(p.expected * 100).toFixed(1)}%</td>
                      <td className="px-5 py-3 font-mono text-white">{(p.observed * 100).toFixed(1)}%</td>
                      <td className={`px-5 py-3 font-mono font-medium ${dev >= 0 ? "text-amber-400" : "text-red-400"}`}>
                        {devStr}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-500">{p.sampleSize.toLocaleString()}</td>
                      <td className={`px-5 py-3 text-xs font-medium ${status.cls}`}>{status.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Interpretation note */}
          <div className="rounded-xl border border-purple-900/40 bg-purple-950/10 p-5">
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.93 6.588l-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM8 5.5a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              <div className="text-xs text-slate-400 leading-relaxed">
                <span className="text-purple-300 font-medium">How to read this: </span>
                A <span className="text-white">perfectly calibrated</span> oracle produces Observed = Expected at every sigma level.
                If Observed {"<"} Expected, the oracle is <span className="text-red-400">over-confident</span> (CI too narrow —
                moves exceed the band more often than they should). If Observed {">"} Expected, it&apos;s
                <span className="text-amber-400"> under-confident</span> (CI too wide, conservative).
                The <span className="text-white">Calibration Score</span> (0–100) measures closeness to perfect, weighted
                toward the ±1σ and ±2σ levels which matter most for DeFi risk pricing.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
