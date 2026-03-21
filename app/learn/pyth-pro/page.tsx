import Link from "next/link";

export const metadata = {
  title: "Pyth Benchmarks & Historical Data · Learn · Pyth Insight",
};

export default function PythProPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-2">
        <Link href="/learn" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">← Back to Learn</Link>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-emerald-400 font-medium tracking-wide uppercase">Education · 4 min read</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Pyth Benchmarks &amp; Historical Data</h1>
      <p className="text-slate-400 text-base mb-10 leading-relaxed">
        The data layer that powers this app&apos;s calibration analysis — and how developers can use it.
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What Pyth Benchmarks is</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            <strong className="text-slate-300">Pyth Benchmarks</strong> is Pyth&apos;s historical price archive.
            Every price update that has ever been published to Pythnet is stored and queryable — with the price,
            confidence interval, and timestamp preserved exactly as they were at publication time.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            This is what makes rigorous CI calibration possible. You cannot audit whether an oracle&apos;s stated
            confidence was accurate without the original CIs from the past. Benchmarks provides exactly that.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">API overview</h2>
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/6 text-xs font-semibold text-slate-400 uppercase">Key endpoints</div>
            <div className="divide-y divide-white/4">
              {[
                {
                  method: "GET",
                  path:   "/v1/shims/tradingview/history",
                  desc:   "OHLCV candles in TradingView format — great for charting libraries. Supports 1m, 5m, 15m, 1h, 1D resolutions.",
                  params: "symbol, resolution, from, to",
                },
                {
                  method: "GET",
                  path:   "/v1/updates/price/{timestamp}",
                  desc:   "Exact price snapshot at a given Unix timestamp. Returns price + conf + expo as published by Pyth at that moment.",
                  params: "ids[] (one per feed), timestamp",
                },
                {
                  method: "GET",
                  path:   "/v1/updates/price/latest",
                  desc:   "Equivalent of the Hermes live endpoint, but from Benchmarks (useful for comparing archive vs live).",
                  params: "ids[]",
                },
              ].map((e) => (
                <div key={e.path} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-emerald-400 font-mono font-bold">{e.method}</span>
                    <code className="text-xs text-slate-300 font-mono">{e.path}</code>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{e.desc}</p>
                  <p className="text-xs text-slate-600">Params: <code className="text-slate-500">{e.params}</code></p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Free tier vs Pyth Pro</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4">
              <div className="text-xs font-semibold text-slate-300 mb-2">Free tier (no key)</div>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• 30 requests / 10 seconds rate limit</li>
                <li>• Full historical archive access</li>
                <li>• All feed IDs available</li>
                <li>• No API key required</li>
                <li className="text-slate-600">• No SLA or priority queue</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/10 p-4">
              <div className="text-xs font-semibold text-emerald-400 mb-2">Pyth Pro (API key)</div>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Higher rate limits</li>
                <li>• Dedicated infrastructure</li>
                <li>• SLA guarantees</li>
                <li>• Priority support</li>
                <li>• Enterprise data agreements</li>
              </ul>
              <a href="https://pyth.network/pro" target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-block text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Apply for Pyth Pro →
              </a>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-3 leading-relaxed">
            This app uses the free tier. For production DeFi protocols that need continuous historical queries,
            Pyth Pro removes rate limit concerns. Add your <code className="text-slate-400">PYTH_PRO_API_KEY</code> to{" "}
            <code className="text-slate-400">.env.local</code> to unlock it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How this app uses it</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-3">
            The CI Calibration Analysis fetches price snapshots at 2-hour intervals over the selected period.
            For each snapshot <em>t</em>, it records <code className="text-slate-300">(price_t, conf_t)</code>,
            then fetches the next snapshot to get <code className="text-slate-300">price_{"{t+horizon}"}</code>.
            The calibration test asks: did <code className="text-slate-300">|price_{"{t+h}"} − price_t| ≤ k × conf_t</code>?
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Running this across thousands of data points gives an empirical capture rate at each sigma level —
            the bar chart on the calibration page. The health score (0–100) summarises how close the oracle is
            to perfect statistical calibration.
          </p>
        </section>

        <div className="flex gap-4 pt-4 border-t border-white/8">
          <Link href="/dashboard/calibration" className="flex-1 rounded-xl border border-purple-800/40 bg-purple-950/15 p-4 hover:border-purple-700/50 transition-colors group">
            <div className="text-xs text-purple-400 font-medium mb-1">Try it →</div>
            <div className="text-sm font-semibold text-white group-hover:text-purple-200 transition-colors">Run the Calibration Analysis</div>
          </Link>
          <Link href="/learn" className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 hover:border-white/15 transition-colors flex items-center">
            <span className="text-xs text-yellow-400">All guides →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
