import PriceFeedGrid from "@/components/PriceFeedGrid";

export const metadata = {
  title: "Live Price Feeds · Pyth Insight",
  description: "Real-time Pyth price feeds for all available assets with live confidence interval bands.",
};

export default function FeedsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-cyan-400 font-medium tracking-wide uppercase">
              Pyth Price Feeds
            </span>
            <span className="text-xs text-slate-600">via Hermes · 3s polling · crypto by default</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Live Price Feeds</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Every price feed available on Pyth Hermes — crypto, forex, metals and more —
            polled live at 3-second intervals. Each card shows the live price, confidence
            interval (±CI), and CI width as a percentage. A narrower CI means the oracle
            is more certain of the price.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 text-right">
          <a
            href="https://pyth.network/price-feeds"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            View all Pyth feeds →
          </a>
          <span className="text-xs text-slate-600">
            Powered by{" "}
            <span className="text-slate-400">Pyth Hermes</span>
            {" "}· public endpoint
          </span>
        </div>
      </div>

      {/* CI Legend */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: "Tight CI",   desc: "< 0.05%",  class: "bg-emerald-950 text-emerald-400 border-emerald-800" },
          { label: "Normal CI",  desc: "0.05–0.2%", class: "bg-sky-950 text-sky-400 border-sky-800"            },
          { label: "Wide CI",    desc: "0.2–0.5%",  class: "bg-amber-950 text-amber-400 border-amber-800"      },
          { label: "Extreme CI", desc: "> 0.5%",    class: "bg-red-950 text-red-400 border-red-800"            },
        ].map((item) => (
          <div key={item.label} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${item.class}`}>
            <span className="font-medium">{item.label}</span>
            <span className="opacity-60">{item.desc}</span>
          </div>
        ))}
        <span className="text-xs text-slate-600 self-center ml-1">
          CI = Pyth confidence interval (oracle uncertainty)
        </span>
      </div>

      {/* Grid */}
      <PriceFeedGrid />

      {/* Footer note */}
      <p className="mt-8 text-xs text-slate-600 leading-relaxed max-w-2xl">
        All feeds are discovered dynamically from Hermes and polled every 3 seconds via REST from{" "}
        <code className="text-slate-500">hermes.pyth.network</code>.
        Confidence intervals represent Pyth&apos;s uncertainty estimate — not a
        guarantee of accuracy. See the{" "}
        <a href="/dashboard/calibration" className="text-purple-400 hover:text-purple-300">
          Calibration Analysis
        </a>{" "}
        to see how well these CIs perform historically.
      </p>
    </div>
  );
}
