import Link from "next/link";

export const metadata = {
  title: "How Pyth's Pull Oracle Works · Learn · Pyth Insight",
};

export default function HowPythWorksPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-2">
        <Link href="/learn" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">← Back to Learn</Link>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-yellow-400 font-medium tracking-wide uppercase">Education · 5 min read</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">How Pyth&apos;s Pull Oracle Works</h1>
      <p className="text-slate-400 text-base mb-10 leading-relaxed">
        Why Pyth is fundamentally different from push-based oracles — and why that matters for DeFi.
      </p>

      <div className="prose-custom space-y-8">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">The problem with push oracles</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Traditional oracles like Chainlink use a <strong className="text-slate-300">push model</strong>: a network of nodes
            writes price updates to the blockchain on a fixed schedule — for example, every heartbeat (e.g. 1 hour) or
            whenever the price moves more than a deviation threshold (e.g. 0.5%).
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            The cost of this model scales with the number of feeds × chains. Each update is an on-chain transaction.
            For 1,000 feeds across 20 chains, that&apos;s potentially 20,000 transactions per heartbeat — most of which
            nobody reads. The protocol pays for updates nobody needed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Pyth&apos;s pull model</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Pyth flips this: price updates are published off-chain to <strong className="text-slate-300">Pythnet</strong>
            (a dedicated Solana appchain) at sub-second intervals. The data lives off-chain at{" "}
            <code className="text-purple-300 text-xs bg-purple-950/40 px-1 rounded">hermes.pyth.network</code>.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            When your DeFi protocol actually needs a price — say, a user is being liquidated — it <em>pulls</em> the
            latest price update from Hermes, bundles it into the transaction, and submits it. The Pyth contract on-chain
            verifies the Wormhole attestation and stores the price temporarily.
          </p>
          <div className="rounded-xl border border-yellow-900/30 bg-yellow-950/10 p-4">
            <p className="text-yellow-300 text-xs font-semibold mb-2">Pull model in a lending protocol</p>
            <ol className="text-slate-400 text-xs leading-relaxed list-decimal list-inside space-y-1">
              <li>User calls <code className="text-slate-300">liquidate(borrower)</code></li>
              <li>Your frontend fetches the signed price update from Hermes</li>
              <li>Your contract calls <code className="text-slate-300">pyth.updatePriceFeeds(update)</code> first</li>
              <li>Then reads <code className="text-slate-300">pyth.getPrice(BTC_FEED_ID)</code></li>
              <li>Proceeds with liquidation using the fresh price</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Why this is better</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Cost", push: "Protocol pays for every update, used or not", pull: "Only pay when your app actually needs a price" },
              { label: "Freshness", push: "Price age = heartbeat interval (often minutes)", pull: "Price published every 400ms — always fresh" },
              { label: "Multi-chain", push: "Must deploy & maintain node infra per chain", pull: "One off-chain network, any chain via Wormhole" },
              { label: "Feed count", push: "Limited — high cost per feed", pull: "1,800+ feeds — economics scale differently" },
            ].map((r) => (
              <div key={r.label} className="rounded-lg border border-white/8 bg-[rgb(17,17,25)] p-4">
                <div className="text-xs font-semibold text-white mb-2">{r.label}</div>
                <div className="text-xs text-red-400 mb-1">Push: {r.push}</div>
                <div className="text-xs text-emerald-400">Pull: {r.pull}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">The confidence interval</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Every Pyth price update includes a <strong className="text-slate-300">confidence interval</strong> — a ±range
            that represents the oracle&apos;s uncertainty at that moment. A tight CI means data sources agree;
            a wide CI means they disagree or liquidity is thin. The CI is what makes Pyth useful for risk calculations —
            and what this app&apos;s Calibration Analysis measures.
          </p>
        </section>

        <div className="flex gap-4 pt-4 border-t border-white/8">
          <Link href="/learn/confidence-intervals" className="flex-1 rounded-xl border border-purple-800/40 bg-purple-950/15 p-4 hover:border-purple-700/50 transition-colors group">
            <div className="text-xs text-purple-400 font-medium mb-1">Next →</div>
            <div className="text-sm font-semibold text-white group-hover:text-purple-200 transition-colors">What Confidence Intervals Really Mean</div>
          </Link>
          <Link href="/dashboard/feeds" className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 hover:border-white/15 transition-colors flex items-center">
            <span className="text-xs text-cyan-400">See live feeds →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
