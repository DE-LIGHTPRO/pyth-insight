import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      {/* Hero */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Built for Pyth Playground Hackathon 2026
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Pyth Insight
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-4">
          The first platform to publicly measure whether Pyth&apos;s confidence intervals
          are statistically accurate — and an AI analyst that explains what the data means.
        </p>

        <p className="text-sm text-slate-500 max-w-xl mx-auto mb-10">
          Powered by Pyth Price Feeds · Pyth Benchmarks · Pyth Entropy · Pyth MCP Server
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/dashboard/calibration" className="btn-primary text-base px-6 py-3">
            View Oracle Health Scores →
          </Link>
          <Link href="/ai" className="btn-secondary text-base px-6 py-3">
            Ask the AI Analyst
          </Link>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
        <FeatureCard
          icon="🎯"
          title="CI Calibration Analysis"
          description="We analyzed months of Pyth historical data to measure whether stated confidence intervals actually capture the right percentage of price moves. Spoiler: some assets are better calibrated than others."
          href="/dashboard/calibration"
          tag="Flagship · Pyth Benchmarks"
        />
        <FeatureCard
          icon="⚡"
          title="Live Price Feeds"
          description="Real-time prices for 20+ assets via Pyth Hermes, with confidence interval bands visualized live on every chart. See oracle uncertainty in real time."
          href="/dashboard/feeds"
          tag="Pyth Price Feeds"
        />
        <FeatureCard
          icon="🤖"
          title="AI Oracle Analyst"
          description="Ask anything about Pyth's data in plain English. Powered by the Pyth MCP Server — the AI has direct access to live prices, historical data, and calibration results."
          href="/ai"
          tag="Pyth MCP Server"
        />
        <FeatureCard
          icon="📊"
          title="Volatility Intelligence"
          description="7-day realized volatility rankings across all tracked assets, alongside CI width trends — is Pyth becoming more or less certain about prices over time?"
          href="/dashboard/volatility"
          tag="Pyth Benchmarks"
        />
        <FeatureCard
          icon="🎲"
          title="Oracle Challenge"
          description="A provably fair prediction game powered by Pyth Entropy. Random historical moments are selected on-chain — can you beat the oracle?"
          href="/game"
          tag="Pyth Entropy · Coming Soon"
        />
        <FeatureCard
          icon="📚"
          title="Learn Pyth"
          description="Interactive guides explaining how Pyth's pull oracle works, what confidence intervals really mean, how Entropy generates verifiable randomness, and more."
          href="/learn"
          tag="Education"
        />
      </div>

      {/* The question */}
      <div className="card border-purple-800/50 bg-purple-950/20 text-center py-12">
        <h2 className="text-2xl font-bold mb-4">
          The question every DeFi protocol silently asks
        </h2>
        <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-6">
          &ldquo;Pyth publishes a confidence interval with every price. But does it actually capture
          68% of outcomes within ±1σ? We ran the numbers so you don&apos;t have to.&rdquo;
        </p>
        <Link href="/dashboard/calibration" className="btn-primary">
          See the calibration results →
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  href,
  tag,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
  tag: string;
}) {
  return (
    <Link href={href} className="card hover:border-purple-700/50 hover:bg-purple-950/10 transition-all group">
      <div className="text-3xl mb-3">{icon}</div>
      <div className="text-xs text-purple-400 mb-2">{tag}</div>
      <h3 className="font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </Link>
  );
}
