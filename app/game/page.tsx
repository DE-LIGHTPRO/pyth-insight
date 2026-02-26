export const metadata = {
  title: "Oracle Challenge · Pyth Insight",
};

export default function GamePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-pink-400 font-medium tracking-wide uppercase">Pyth Entropy</span>
            <span className="text-xs text-slate-600">Verifiable on-chain randomness</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Oracle Challenge</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            A provably fair prediction game powered by Pyth Entropy. Random historical price
            moments are selected on-chain — can you predict whether the CI captured the next move?
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-8">
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-14 h-14 rounded-2xl bg-pink-950/60 border border-pink-800/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-pink-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9.563C9 9.252 9.252 9 9.563 9h4.874c.311 0 .563.252.563.563v4.874c0 .311-.252.563-.563.563H9.564A.562.562 0 019 14.437V9.564z" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-pink-400 font-medium tracking-wide uppercase mb-2">Coming Soon</div>
            <p className="text-white font-semibold text-lg">Oracle Challenge</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              After the core analytics features ship, this Pyth Entropy-powered game lets
              you test your intuition against the oracle&apos;s confidence intervals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
