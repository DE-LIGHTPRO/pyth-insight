import Link from "next/link";

export const metadata = {
  title: "Learn Pyth · Pyth Insight",
};

const GUIDES = [
  {
    href:  "/learn/how-pyth-works",
    color: "text-yellow-400",
    bg:    "bg-yellow-950/40 border-yellow-800/30",
    title: "How Pyth's Pull Oracle Works",
    desc:  "Why Pyth is different from push-based oracles and how the pull model dramatically reduces on-chain costs.",
    time:  "5 min read",
  },
  {
    href:  "/learn/confidence-intervals",
    color: "text-purple-400",
    bg:    "bg-purple-950/40 border-purple-800/30",
    title: "What Confidence Intervals Really Mean",
    desc:  "The ±CI on every Pyth price update — what it measures, how it's computed, and how calibrated it is.",
    time:  "7 min read",
  },
  {
    href:  "/learn/entropy",
    color: "text-sky-400",
    bg:    "bg-sky-950/40 border-sky-800/30",
    title: "Verifiable Randomness with Pyth Entropy",
    desc:  "How Entropy generates on-chain randomness that nobody — including Pyth — can predict or manipulate.",
    time:  "5 min read",
  },
  {
    href:  "/learn/pyth-pro",
    color: "text-emerald-400",
    bg:    "bg-emerald-950/40 border-emerald-800/30",
    title: "Pyth Pro & Benchmarks — Historical Oracle Data",
    desc:  "How Pyth Benchmarks powers the volatility dashboard and calibration analysis — and how developers can query the full historical price archive.",
    time:  "4 min read",
  },
];

export default function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-yellow-400 font-medium tracking-wide uppercase">Education</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Learn Pyth</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            Interactive guides explaining how Pyth&apos;s oracle network works — with live data
            examples pulled directly from the feeds.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-12">
        {GUIDES.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5 hover:border-white/15 hover:bg-[rgb(20,20,30)] transition-all group"
          >
            <div className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border mb-3 ${guide.bg} ${guide.color}`}>
              {guide.time}
            </div>
            <h3 className={`font-semibold text-white mb-2 group-hover:${guide.color} transition-colors text-sm`}>
              {guide.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">{guide.desc}</p>
            <div className={`mt-3 text-xs font-medium flex items-center gap-1 ${guide.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
              Read guide
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Real-World Oracle Attack Case Study ────────────────────────────── */}
      <div className="rounded-xl border border-red-900/50 bg-red-950/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-red-900/30 bg-red-950/20">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs font-bold text-red-400 tracking-wide uppercase">Live Case Study</span>
          </span>
          <span className="text-xs text-slate-500">February 2026</span>
          <span className="ml-auto text-xs font-semibold text-red-300">$388,307 stolen</span>
        </div>

        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-white mb-1">
            The $388K Oracle Mismatch: @ploutos_money Exploit
          </h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            A DeFi lending protocol was drained in a single transaction because it used
            the wrong Chainlink price feed. This is a textbook oracle misconfiguration —
            and exactly the class of failure Pyth&apos;s design prevents.
          </p>

          {/* Attack anatomy */}
          <div className="space-y-3 mb-6">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Attack anatomy</div>

            {[
              {
                step: "1",
                color: "bg-slate-700 text-slate-300",
                title: "Oracle misconfiguration",
                body: "The protocol configured the BTC/USD Chainlink feed as the price source for USDC collateral — a stablecoin whose value should always be ≈ $1.00.",
              },
              {
                step: "2",
                color: "bg-amber-900/60 text-amber-300",
                title: "Inflated collateral value",
                body: "BTC/USD was trading at ~$80,000+. The protocol read this and believed 1 USDC = $80,000 — an 80,000× inflation of its real value.",
              },
              {
                step: "3",
                color: "bg-red-900/60 text-red-300",
                title: "Exploit: 8 USDC → 187 ETH",
                body: "Attacker deposited 8.879 USDC (~$8.88 real value). Protocol calculated collateral = 8.879 × $80,000 = ~$710,000. They borrowed 187.36 ETH ($388,307) against it and walked away.",
              },
              {
                step: "4",
                color: "bg-purple-900/60 text-purple-300",
                title: "Net profit: $376,674",
                body: "After paying $11,632 to a block builder (MEV tip), the attacker kept $376,674. Total attack cost: $8.88 in USDC.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${s.color}`}>
                  {s.step}
                </div>
                <div>
                  <div className="text-white text-sm font-medium mb-0.5">{s.title}</div>
                  <div className="text-slate-400 text-xs leading-relaxed">{s.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Why Pyth prevents this */}
          <div className="rounded-lg border border-purple-800/40 bg-purple-950/20 p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-purple-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 6.237l-4.5 4.5a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06l1.47 1.47 3.97-3.97a.75.75 0 011.06 1.06z"/>
              </svg>
              <span className="text-sm font-semibold text-purple-300">How Pyth&apos;s design prevents this</span>
            </div>
            <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
              <p>
                Every Pyth price feed carries a <span className="text-white font-medium">symbol identifier</span> and a
                <span className="text-white font-medium"> confidence interval (CI)</span>. A correctly integrated Pyth feed
                for USDC should query <code className="text-purple-300">Crypto.USDC/USD</code> — which publishes at
                ≈ $1.0000 with a CI of ±$0.0003 (0.03% uncertainty).
              </p>
              <p>
                If you accidentally query <code className="text-red-300">Crypto.BTC/USD</code> for USDC pricing, Pyth
                returns ≈ $80,000 with a CI of ±$400 (0.5% uncertainty). A stablecoin
                with a <span className="text-red-300">±$400 confidence band</span> is an immediate on-chain red flag —
                protocols can enforce CI width limits as a circuit breaker.
              </p>
              <p>
                <span className="text-purple-300 font-medium">The CI is a free, built-in sanity check.</span> Any protocol
                that enforces <code className="text-slate-300">require(confPct &lt; 0.5%, &quot;Oracle too uncertain&quot;)</code> would
                have rejected the malicious BTC/USD feed for a stablecoin and the exploit would have failed at the
                smart contract level — automatically, with zero additional code.
              </p>
            </div>
          </div>

          {/* Live CI comparison */}
          <div className="rounded-lg border border-white/8 bg-[rgb(17,17,25)] p-4 mb-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Live CI comparison — right now
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/30 p-3">
                <div className="text-emerald-400 font-semibold mb-1">Correct: USDC/USD</div>
                <div className="text-white font-mono">≈ $1.0000</div>
                <div className="text-emerald-400/70 font-mono text-[10px] mt-1">CI: ±$0.0003 · &lt;0.03%</div>
                <div className="text-slate-500 mt-1.5">Tight CI → high oracle certainty → safe to use as collateral price</div>
              </div>
              <div className="rounded-lg bg-red-950/30 border border-red-800/30 p-3">
                <div className="text-red-400 font-semibold mb-1">Wrong: BTC/USD for USDC</div>
                <div className="text-white font-mono">≈ $84,000</div>
                <div className="text-red-400/70 font-mono text-[10px] mt-1">CI: ±$420 · ~0.5%</div>
                <div className="text-slate-500 mt-1.5">Wide CI for a stablecoin → immediate red flag → circuit breaker fires</div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-3 text-xs">
            <Link
              href="/dashboard/calibration"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-700/30 border border-purple-700/50 text-purple-300 hover:bg-purple-700/50 transition-colors font-medium"
            >
              See live CI calibration analysis →
            </Link>
            <Link
              href="/dashboard/feeds"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/8 text-slate-300 hover:bg-white/8 transition-colors font-medium"
            >
              Compare USDC/USD vs BTC/USD live →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
