export const metadata = {
  title: "AI Oracle Analyst · Pyth Insight",
};

const CAPABILITIES = [
  { title: "Natural-language price queries", desc: 'Ask "Which asset has the tightest CI right now?" and get an instant answer.' },
  { title: "Calibration Q&A",               desc: "Ask about calibration quality, what deviations mean, or how to interpret confidence scores." },
  { title: "Historical context",             desc: "Reference Benchmarks data in conversation — compare today's CI to last week's." },
  { title: "Pyth MCP Server integration",    desc: "Built on the Pyth MCP Server so the AI can query live feeds mid-conversation." },
];

export default function AIPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-green-400 font-medium tracking-wide uppercase">AI Intelligence</span>
            <span className="text-xs text-slate-600">Pyth MCP + Anthropic Claude</span>
          </div>
          <h1 className="text-2xl font-bold text-white">AI Oracle Analyst</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            Ask anything about Pyth&apos;s price data, confidence intervals, or calibration results
            in plain English — powered by Pyth MCP Server + Claude.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-8 mb-5">
        <div className="flex flex-col items-center text-center gap-4 py-8">
          <div className="w-14 h-14 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-green-400 font-medium tracking-wide uppercase mb-2">In Development</div>
            <p className="text-white font-semibold text-lg">AI Oracle Analyst</p>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Conversational AI interface wired to live Pyth data via the Pyth MCP Server.
              Core features are live — AI analyst ships next.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {CAPABILITIES.map((c) => (
          <div key={c.title} className="rounded-xl border border-white/6 bg-[rgb(17,17,25)] p-4 opacity-60">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
              <div>
                <div className="text-white font-medium text-sm mb-0.5">{c.title}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{c.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
