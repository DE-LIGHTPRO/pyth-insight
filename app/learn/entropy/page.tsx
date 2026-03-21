import Link from "next/link";

export const metadata = {
  title: "Verifiable Randomness with Pyth Entropy · Learn · Pyth Insight",
};

export default function EntropyLearnPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-2">
        <Link href="/learn" className="text-xs text-slate-500 hover:text-slate-400 transition-colors">← Back to Learn</Link>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-sky-400 font-medium tracking-wide uppercase">Education · 5 min read</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Verifiable Randomness with Pyth Entropy</h1>
      <p className="text-slate-400 text-base mb-10 leading-relaxed">
        How Entropy generates on-chain randomness that nobody — including Pyth — can predict or manipulate.
      </p>

      <div className="space-y-8">

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">The randomness problem on-chain</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Blockchains are deterministic — every node must compute the same result. That makes true randomness
            impossible from on-chain data alone. Common workarounds like <code className="text-slate-300 text-xs">blockhash</code>
            are manipulable by miners/validators. NFT mints, lotteries, and games need better guarantees.
          </p>
          <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-4">
            <p className="text-red-300 text-xs font-semibold mb-1">Why blockhash is unsafe</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              A miner who sees an unfavorable <code className="text-slate-300">blockhash</code> result can simply
              discard their block and mine a new one. The expected cost to manipulate a lottery:
              approximately (expected profit) / (block reward). For high-value NFT mints, this is economically rational.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How Pyth Entropy works</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Pyth Entropy uses a <strong className="text-slate-300">commit-reveal scheme</strong> between two parties:
            the user and the Pyth Fortuna provider. Neither party can know the final random number in advance.
          </p>
          <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-white/6 text-xs font-semibold text-slate-400 uppercase">The protocol</div>
            <div className="divide-y divide-white/4">
              {[
                { step: "1", actor: "You", action: "Generate a random number locally. Submit its hash to the Entropy contract on-chain. The contract records your commitment." },
                { step: "2", actor: "Fortuna", action: "The Pyth provider sees your commitment and reveals its pre-committed random number (from a hash chain it cannot change retroactively)." },
                { step: "3", actor: "Contract", action: "XOR your random number with the provider's. The result is verifiably random — neither party could have predicted it alone." },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 px-4 py-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-950/60 border border-sky-800/40 flex items-center justify-center text-sky-400 text-xs font-bold">{s.step}</div>
                  <div>
                    <span className="text-sky-400 text-xs font-semibold">{s.actor}: </span>
                    <span className="text-slate-400 text-xs leading-relaxed">{s.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Why neither party can cheat</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { who: "You can't cheat", why: "Your random number is committed before the provider reveals theirs. You can't change it retroactively — the hash binds you." },
              { who: "Pyth can't cheat", why: "The provider's random numbers come from a pre-published hash chain. They're committed long before any request is made — the provider cannot retroactively change them." },
            ].map((s) => (
              <div key={s.who} className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4">
                <div className="text-xs font-semibold text-emerald-400 mb-2">{s.who}</div>
                <p className="text-xs text-slate-400 leading-relaxed">{s.why}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Entropy in this app</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            The <Link href="/game" className="text-pink-400 hover:text-pink-300 underline underline-offset-2">Oracle Challenge</Link> uses
            Pyth Entropy to seed each round. The app reads the current sequence number from the Fortuna provider on Base mainnet — a value
            that changes with every entropy request made by any user on the network. This is used as a deterministic, verifiable seed
            to pick which price feed appears in the game round.
          </p>
          <div className="rounded-xl border border-pink-900/30 bg-pink-950/10 p-4">
            <p className="text-pink-300 text-xs font-semibold mb-2">Contracts on Base mainnet</p>
            <div className="space-y-1.5">
              {[
                { label: "Entropy contract", addr: "0x98046Bd286715D3B0BC227Dd7a956b83D8978603", url: "https://basescan.org/address/0x98046Bd286715D3B0BC227Dd7a956b83D8978603" },
                { label: "Fortuna provider",  addr: "0x52DeaA1c84233F7bb8C8A45baeDE41091c616506", url: "https://basescan.org/address/0x52DeaA1c84233F7bb8C8A45baeDE41091c616506" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-32">{c.label}</span>
                  <a href={c.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 font-mono underline underline-offset-2">
                    {c.addr.slice(0, 10)}…{c.addr.slice(-8)}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Use cases</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { title: "NFT mints", desc: "Assign traits randomly at mint time — verified fairly on-chain." },
              { title: "Gaming", desc: "Loot drops, critical hits, matchmaking — all provably fair." },
              { title: "Lotteries / raffles", desc: "No miner manipulation — the random seed is unknowable until reveal." },
            ].map((u) => (
              <div key={u.title} className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4">
                <div className="text-xs font-semibold text-sky-400 mb-1">{u.title}</div>
                <p className="text-xs text-slate-500 leading-relaxed">{u.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-4 pt-4 border-t border-white/8">
          <Link href="/learn/pyth-pro" className="flex-1 rounded-xl border border-emerald-800/40 bg-emerald-950/15 p-4 hover:border-emerald-700/50 transition-colors group">
            <div className="text-xs text-emerald-400 font-medium mb-1">Next →</div>
            <div className="text-sm font-semibold text-white group-hover:text-emerald-200 transition-colors">Pyth Benchmarks &amp; Historical Data</div>
          </Link>
          <Link href="/game" className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 hover:border-white/15 transition-colors flex items-center">
            <span className="text-xs text-pink-400">Play Oracle Challenge →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
