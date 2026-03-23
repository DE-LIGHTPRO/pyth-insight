"use client";

/**
 * Volatility Intelligence — live realized volatility rankings
 * powered by Pyth Benchmarks historical OHLCV data.
 */

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { AssetVolatility, VolRegime } from "@/app/api/volatility/route";
import { PRICE_IDS, BENCHMARKS_SYMBOLS, ID_TO_SYMBOL } from "@/lib/pyth/price-ids";

function ciAlignmentVerdict(ratio: number): AssetVolatility["ciAlignment"] {
  if (ratio <= 0)   return "unknown";
  if (ratio < 0.5)  return "tight";
  if (ratio < 1.5)  return "aligned";
  return "wide";
}

// ── Regime styling ─────────────────────────────────────────────────────────────

const REGIME_STYLE: Record<VolRegime, { pill: string; bar: string; label: string }> = {
  low:     { pill: "bg-emerald-950 text-emerald-400 border-emerald-700", bar: "#10b981", label: "Low"     },
  medium:  { pill: "bg-sky-950 text-sky-400 border-sky-700",             bar: "#38bdf8", label: "Medium"  },
  high:    { pill: "bg-amber-950 text-amber-400 border-amber-700",       bar: "#f59e0b", label: "High"    },
  extreme: { pill: "bg-red-950 text-red-400 border-red-700",             bar: "#ef4444", label: "Extreme" },
};

// ── Mini sparkline (inline SVG) ────────────────────────────────────────────────

function MiniSparkline({ closes, regime }: { closes: number[]; regime: VolRegime }) {
  if (closes.length < 3) return null;
  const w = 80, h = 28, pad = 2;
  const min   = Math.min(...closes);
  const max   = Math.max(...closes);
  const range = max - min || max * 0.001 || 1;
  const pts   = closes.map((c, i) => ({
    x: (i / (closes.length - 1)) * w,
    y: pad + (1 - (c - min) / range) * (h - pad * 2),
  }));
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
    d += ` C ${cpx},${pts[i - 1].y.toFixed(1)} ${cpx},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  }
  const color = REGIME_STYLE[regime].bar;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Custom bar chart tooltip ────────────────────────────────────────────────────

function VolTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rv7d  = payload.find((p) => p.name === "7d RV");
  const rv24h = payload.find((p) => p.name === "24h RV");
  return (
    <div className="rounded-lg border border-white/10 bg-[rgb(14,14,22)] px-4 py-3 shadow-xl text-sm">
      <div className="font-semibold text-white mb-2">{label}</div>
      {rv7d  && <div className="text-slate-400">7d RV: <span className="text-white font-mono">{rv7d.value.toFixed(1)}%</span></div>}
      {rv24h && <div className="text-slate-400 mt-0.5">24h RV: <span className="text-white font-mono">{rv24h.value.toFixed(1)}%</span></div>}
    </div>
  );
}

// ── Trend arrow ────────────────────────────────────────────────────────────────

function TrendBadge({ trend }: { trend: number }) {
  const rising  = trend > 5;
  const falling = trend < -5;
  if (rising)  return <span className="text-red-400 text-xs font-mono">↑ +{trend.toFixed(1)}%</span>;
  if (falling) return <span className="text-emerald-400 text-xs font-mono">↓ {trend.toFixed(1)}%</span>;
  return <span className="text-slate-500 text-xs font-mono">→ {trend > 0 ? "+" : ""}{trend.toFixed(1)}%</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VolatilityPage() {
  const [data,    setData]    = useState<AssetVolatility[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/volatility");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Server error ${res.status}`);
      const rvData = json as AssetVolatility[];
      setData(rvData);

      // Fetch CI widths directly from Hermes in the browser.
      // Vercel serverless cannot reach hermes.pyth.network from server-side routes,
      // but the browser can — same pattern the Live Feeds page uses for SSE.
      // NOTE: must use manual ids[] format — Hermes rejects percent-encoded %5B%5D.
      try {
        const benchIds = (Object.keys(BENCHMARKS_SYMBOLS) as string[])
          .map((s) => PRICE_IDS[s]?.replace(/^0x/, ""))
          .filter((id): id is string => Boolean(id));
        const params = benchIds.map((id) => `ids[]=${id}`).join("&");
        const ciRes  = await fetch(
          `https://hermes.pyth.network/v2/updates/price/latest?${params}&parsed=true&ignore_invalid_price_ids=true`
        );
        if (ciRes.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ciData = (await ciRes.json()) as { parsed?: any[] };
          const ciWidths: Record<string, number> = {};
          for (const p of ciData.parsed ?? []) {
            const rawId = (p.id as string).replace(/^0x/, "");
            const sym   = ID_TO_SYMBOL[rawId];
            if (!sym) continue;
            const expo  = p.price.expo as number;
            const scale = Math.pow(10, expo);
            const price = Math.abs(Number(p.price.price) * scale);
            const conf  = Number(p.price.conf)  * scale;
            if (price > 0) {
              ciWidths[sym] = parseFloat(((conf / price) * Math.sqrt(8760) * 100).toFixed(4));
            }
          }
          setData((prev) =>
            prev?.map((a) => {
              const ciWidthPct = ciWidths[a.symbol] ?? 0;
              const ciRvRatio  =
                a.rv7d > 0 && ciWidthPct > 0
                  ? parseFloat((ciWidthPct / a.rv7d).toFixed(3))
                  : 0;
              return { ...a, ciWidthPct, ciRvRatio, ciAlignment: ciAlignmentVerdict(ciRvRatio) };
            }) ?? null
          );
        }
      } catch {
        // CI data is optional — RV data already displayed, leave "—"
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load volatility data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount
  useEffect(() => { load(); }, [load]);

  // Chart data
  const chartData = data?.map((a) => ({
    name:    a.symbol.split("/")[0],
    "7d RV":  a.rv7d,
    "24h RV": a.rv24h,
    regime:  a.regime,
  })) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-orange-400 font-medium tracking-wide uppercase">Oracle Intelligence</span>
            <span className="text-xs text-slate-600">via Pyth Benchmarks</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Volatility Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            7-day realized volatility rankings and 24h trend analysis across all Pyth-tracked
            crypto assets — computed from Benchmarks hourly OHLCV data.
          </p>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-orange-700/60 bg-orange-950/30 text-orange-400 hover:bg-orange-950/60 hover:text-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <svg className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" strokeLinecap="round"/>
              <path d="M13.5 2.5v3h-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <a
            href="https://benchmarks.pyth.network"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            Pyth Benchmarks API →
          </a>
        </div>
      </div>

      {/* Loading skeleton — mimics the table layout */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {/* Chart skeleton */}
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5 h-[340px] flex flex-col gap-3">
            <div className="h-4 w-48 bg-white/6 rounded" />
            <div className="h-3 w-72 bg-white/4 rounded" />
            <div className="flex-1 flex items-end gap-2 pt-4">
              {Array.from({ length: 17 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-orange-900/30 rounded-t"
                  style={{ height: `${30 + Math.sin(i * 0.8) * 20 + (i % 3) * 10}%` }}
                />
              ))}
            </div>
          </div>
          {/* Table skeleton */}
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
              <div className="h-4 w-32 bg-white/6 rounded" />
              <div className="h-3 w-48 bg-white/4 rounded" />
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/4">
                <div className="h-3 w-4 bg-white/4 rounded" />
                <div className="h-3 w-10 bg-white/6 rounded" />
                <div className="h-3 w-12 bg-white/6 rounded" />
                <div className="h-3 w-12 bg-white/4 rounded" />
                <div className="h-3 w-14 bg-white/4 rounded" />
                <div className="h-5 w-24 bg-white/4 rounded-full" />
                <div className="h-5 w-16 bg-white/4 rounded-full" />
                <div className="h-5 w-20 bg-white/3 rounded" />
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-600 pt-1">
            Loading hourly candles from <code>benchmarks.pyth.network</code>…
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-6 flex items-start gap-3 mb-6">
          <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" />
          </svg>
          <div>
            <p className="text-red-300 font-medium text-sm">Failed to load volatility data</p>
            <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
            <button onClick={load} className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
              Retry →
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Regime legend */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(["low","medium","high","extreme"] as VolRegime[]).map((r) => (
              <div key={r} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${REGIME_STYLE[r].pill}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: REGIME_STYLE[r].bar }} />
                {REGIME_STYLE[r].label} vol · {data.filter((a) => a.regime === r).length} assets
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-white">Realized Volatility Rankings</div>
                <div className="text-xs text-slate-500 mt-0.5">Annualized, computed from Pyth Benchmarks hourly candles</div>
              </div>
              <div className="flex gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-sm bg-orange-500 inline-block" /> 7d RV</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-sm bg-orange-900/80 inline-block" /> 24h RV</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<VolTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="7d RV" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={REGIME_STYLE[entry.regime as VolRegime].bar} />
                  ))}
                </Bar>
                <Bar dataKey="24h RV" fill="rgba(251,146,60,0.35)" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Rankings table */}
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] overflow-hidden mb-5">
            <div className="px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Detailed Rankings</span>
              <span className="text-xs text-slate-500">Sorted by 7-day RV · highest first</span>
            </div>
            {/* overflow-x-auto ensures horizontal scroll on small screens */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-white/6">
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">#</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">Asset</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">7d RV</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">24h RV</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">Vol Trend</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">
                      CI/RV Alignment
                      <span
                        className="ml-1 text-slate-600 cursor-help"
                        title="Compares live Hermes CI width (annualized) against 7d realized volatility from Pyth Benchmarks. Feed IDs missing on Hermes show —."
                      >ⓘ</span>
                    </th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5">Regime</th>
                    <th className="text-left text-xs text-slate-500 font-medium px-4 py-2.5 hidden sm:table-cell">48h Price</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((a, i) => {
                    const rs = REGIME_STYLE[a.regime];
                    // XRP and any other assets without a Hermes feed ID will always show "—"
                    // because we can't fetch live CI without a valid price feed ID.
                    const hasHermesFeedId = Boolean(PRICE_IDS[a.symbol]);
                    return (
                      <tr key={a.symbol} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-white">{a.symbol.split("/")[0]}</td>
                        <td className="px-4 py-3 font-mono text-white font-medium">{a.rv7d.toFixed(1)}%</td>
                        <td className="px-4 py-3 font-mono text-slate-400">{a.rv24h.toFixed(1)}%</td>
                        <td className="px-4 py-3"><TrendBadge trend={a.rvTrend} /></td>
                        <td className="px-4 py-3">
                          {a.ciAlignment === "unknown" ? (
                            <span
                              className="text-xs text-slate-600 cursor-help"
                              title={
                                hasHermesFeedId
                                  ? "CI data unavailable — Hermes returned no data for this feed"
                                  : "Live CI unavailable — Hermes feed ID not found for this asset"
                              }
                            >
                              —
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                              a.ciAlignment === "tight"   ? "bg-red-950 text-red-400 border-red-700" :
                              a.ciAlignment === "aligned" ? "bg-emerald-950 text-emerald-400 border-emerald-700" :
                              "bg-amber-950 text-amber-400 border-amber-700"
                            }`}>
                              {a.ciAlignment === "tight"   && "⚠ Over-confident"}
                              {a.ciAlignment === "aligned" && "✓ Aligned"}
                              {a.ciAlignment === "wide"    && "Conservative"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${rs.pill}`}>
                            {rs.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <MiniSparkline closes={a.closes} regime={a.regime} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interpretation */}
          <div className="rounded-xl border border-orange-900/40 bg-orange-950/10 p-5">
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.93 6.588l-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM8 5.5a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              <div className="text-xs text-slate-400 leading-relaxed">
                <span className="text-orange-300 font-medium">How to read this: </span>
                Realized Volatility (RV) measures how much an asset&apos;s price actually moved, expressed as
                an <span className="text-white">annualized percentage</span> computed from hourly log returns
                via Pyth Benchmarks. When <span className="text-red-400">24h RV {">"} 7d RV</span>, short-term
                volatility is rising. The <span className="text-white">CI/RV Alignment</span> column compares
                Pyth&apos;s live confidence interval width against realized volatility —
                <span className="text-red-400"> ⚠ Over-confident</span> means Pyth&apos;s CI is tighter than
                actual price movement (risky for DeFi liquidation engines);
                <span className="text-emerald-400"> ✓ Aligned</span> means CI matches realized vol well.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
