import Link from "next/link";

export const metadata = {
  title: "What Confidence Intervals Really Mean · Learn · Pyth Insight",
};

export default function CIPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-2">
        <Link href="/learn" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">← Back to Learn</Link>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-purple-400 font-medium tracking-wide uppercase">Education · 7 min read</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">What Confidence Intervals Really Mean</h1>
      <p className="text-slate-400 text-base mb-10 leading-relaxed">
        The ±CI published with every Pyth price — what it measures, how it&apos;s computed, and whether it&apos;s calibrated.
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What the CI is</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Every Pyth price update contains three numbers: <code className="text-purple-300 text-xs bg-purple-950/40 px-1 rounded">price</code>,{" "}
            <code className="text-purple-300 text-xs bg-purple-950/40 px-1 rounded">conf</code>, and{" "}
            <code className="text-purple-300 text-xs bg-purple-950/40 px-1 rounded">expo</code>.
            The confidence is a half-width: the true price is expected to lie in the range{" "}
            <strong className="text-slate-300">[price − conf, price + conf]</strong>.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            Pyth aggregates prices from dozens of first-party data publishers — market makers, exchanges, and trading firms
            who submit their own observed prices. The CI reflects how much those publishers <em>disagree</em> with each other
            at that moment. Wide disagreement → wide CI. Tight agreement → tight CI.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What calibrated means</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            In probability theory, a confidence interval is <strong className="text-slate-300">well-calibrated</strong> if
            the stated coverage probability matches the observed frequency. A perfect ±1σ CI should contain the true price
            68.3% of the time. A ±2σ CI should contain it 95.4% of the time.
          </p>
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] overflow-hidden mb-4">
            <div className="px-4 py-2.5 border-b border-white/6 text-xs font-semibold text-slate-400 uppercase">Normal distribution coverage targets</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/6">
                  <th className="text-left text-xs text-slate-500 px-4 py-2">CI width</th>
                  <th className="text-left text-xs text-slate-500 px-4 py-2">Expected coverage</th>
                  <th className="text-left text-xs text-slate-500 px-4 py-2">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["±0.5σ", "38.3%", "Very tight — high certainty required"],
                  ["±1.0σ", "68.3%", "Standard deviation — typical usage"],
                  ["±1.5σ", "86.6%", "Conservative buffer"],
                  ["±2.0σ", "95.4%", "Very safe — liquidation engines often use this"],
                  ["±3.0σ", "99.7%", "Extreme — essentially guaranteed containment"],
                ].map(([w, cov, m]) => (
                  <tr key={w} className="border-b border-white/4">
                    <td className="px-4 py-2 font-mono text-white text-xs">{w}</td>
                    <td className="px-4 py-2 font-mono text-purple-400 text-xs">{cov}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">
            If Pyth&apos;s CI is <strong className="text-slate-300">over-confident</strong> (observed coverage {"<"} expected),
            protocols using it for liquidation triggers or price guardrails are exposed to more risk than they think.
            If it is <strong className="text-slate-300">under-confident</strong> (too wide), capital is being unnecessarily
            locked up in collateral buffers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How this app measures it</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            The <Link href="/dashboard/calibration" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">CI Calibration Analysis</Link> page
            fetches historical price snapshots from the{" "}
            <strong className="text-slate-300">Pyth Benchmarks API</strong> at hourly intervals.
            For each snapshot, it records the published price and CI, then checks whether the actual price
            at the next interval fell within ±kσ of the snapshot&apos;s CI — for k ∈ {"{0.5, 1, 1.5, 2, 2.5, 3}"}.
          </p>
          <div className="rounded-xl border border-purple-900/40 bg-purple-950/10 p-4">
            <p className="text-purple-300 text-xs font-semibold mb-2">Why this matters for DeFi</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              The $388K oracle exploit referenced on the home page happened because a protocol used a BTC/USD
              feed to price USDC collateral — a mismatch the CI would have flagged (a $79,999 price with a
              ±$1 CI for something that should be valued at $1 is an obvious anomaly). Calibrated CIs give
              protocols a principled way to detect such mismatches at runtime.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to use CI in your protocol</h2>
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4">
            <p className="text-slate-400 text-xs font-mono mb-3 text-slate-300">{`// Solidity — safe price check with CI guard`}</p>
            <pre className="text-xs text-slate-400 leading-relaxed overflow-x-auto whitespace-pre">{`PythStructs.Price memory p = pyth.getPriceNoOlderThan(
    BTC_USD_FEED, 60 // max 60 seconds stale
);

// Reject if CI is too wide (oracle uncertain)
uint256 confPct = uint256(p.conf) * 10000 / uint256(p.price);
require(confPct < 50, "Oracle CI too wide"); // reject if CI > 0.5%

// Use p.price safely`}</pre>
          </div>
        </section>

        <div className="flex gap-4 pt-4 border-t border-white/8">
          <Link href="/learn/entropy" className="flex-1 rounded-xl border border-sky-800/40 bg-sky-950/15 p-4 hover:border-sky-700/50 transition-colors group">
            <div className="text-xs text-sky-400 font-medium mb-1">Next →</div>
            <div className="text-sm font-semibold text-white group-hover:text-sky-200 transition-colors">Verifiable Randomness with Pyth Entropy</div>
          </Link>
          <Link href="/dashboard/calibration" className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 hover:border-white/15 transition-colors flex items-center">
            <span className="text-xs text-purple-400">Run calibration →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
