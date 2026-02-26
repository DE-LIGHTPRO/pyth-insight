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
    title: "Pyth Benchmarks & Historical Data",
    desc:  "The data layer that powers this app's calibration analysis — and how developers can use it.",
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

      <div className="grid sm:grid-cols-2 gap-4">
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
    </div>
  );
}
