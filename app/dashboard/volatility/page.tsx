import Link from "next/link";

export const metadata = {
  title: "Volatility Intelligence · Pyth Insight",
};

const PREVIEW_FEATURES = [
  {
    title: "Realized Volatility Rankings",
    desc:  "7-day and 30-day annualized RV computed from Pyth Benchmarks hourly candles, ranked by vol regime.",
  },
  {
    title: "CI Width Trend Analysis",
    desc:  "Detect when Pyth's confidence intervals are widening or tightening — early signal for regime changes.",
  },
  {
    title: "Cross-Asset Correlation",
    desc:  "Live correlation matrix showing which assets move together using Pyth's simultaneous price updates.",
  },
  {
    title: "Vol Surface Heatmap",
    desc:  "Rolling 24h × 7-day heatmap of intraday CI width fluctuations per asset — spot patterns instantly.",
  },
];

export default function VolatilityPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-orange-400 font-medium tracking-wide uppercase">Oracle Intelligence</span>
            <span className="text-xs text-slate-600">via Pyth Benchmarks</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Volatility Intelligence</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            7-day realized volatility rankings and CI width trend analysis across all Pyth-tracked
            assets — powered by the Benchmarks historical data API.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-8 mb-5">
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-950/60 border border-orange-800/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-orange-400 font-medium tracking-wide uppercase mb-2">In Development</div>
            <p className="text-white font-semibold text-lg">Volatility Intelligence</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Historical volatility analysis powered by Pyth Benchmarks OHLCV data.
              The CI Calibration Analysis is live now — this module ships next.
            </p>
          </div>
          <Link
            href="/dashboard/calibration"
            className="mt-2 px-5 py-2.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 border border-orange-700/50 text-orange-300 text-sm font-medium transition-all"
          >
            Try Calibration Analysis instead →
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {PREVIEW_FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-white/6 bg-[rgb(17,17,25)] p-4 opacity-60">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
              <div>
                <div className="text-white font-medium text-sm mb-0.5">{f.title}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
