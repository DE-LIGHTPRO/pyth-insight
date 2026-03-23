import Link from "next/link";
import type { ReactNode } from "react";

// ── SVG icons — no emojis anywhere ───────────────────────────────────────────

function IconTarget() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconFeed() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

function IconAI() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function IconVolatility() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconGame() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function IconLearn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon:        ReactNode;
  iconBg:      string;
  iconColor:   string;
  title:       string;
  description: string;
  href:        string;
  tag:         string;
  tagColor:    string;
  live?:       boolean;
}

function FeatureCard({
  icon, iconBg, iconColor, title, description, href, tag, tagColor, live,
}: FeatureCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-5 hover:border-white/15 hover:bg-[rgb(20,20,30)] transition-all duration-200"
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-lg ${iconBg} border ${iconColor.replace("text-", "border-").replace("-400", "-800/40").replace("-300", "-800/40")} flex items-center justify-center mb-4 ${iconColor}`}>
        {icon}
      </div>

      {/* Tag */}
      <div className={`text-xs font-medium mb-2 ${tagColor}`}>{tag}</div>

      {/* Title row */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-white text-sm group-hover:text-purple-200 transition-colors">
          {title}
        </h3>
        {live && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 leading-relaxed flex-1">{description}</p>

      {/* Arrow */}
      <div className="mt-4 flex items-center gap-1 text-xs text-slate-600 group-hover:text-purple-400 transition-colors">
        Explore
        <svg className="w-3 h-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </Link>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="text-center mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-purple-300 text-xs mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          Built for Pyth Playground Hackathon 2026
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Pyth Insight
        </h1>

        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          The first platform to publicly measure whether Pyth&apos;s confidence intervals
          are statistically accurate — and an AI analyst that explains what the data means.
        </p>

        <p className="text-sm text-slate-600 max-w-xl mx-auto mb-6">
          Powered by Pyth Price Feeds · Pyth Benchmarks · Pyth Entropy
        </p>

        {/* Live oracle attack callout */}
        <div className="inline-flex items-start gap-2.5 px-4 py-2.5 rounded-xl border border-red-800/50 bg-red-950/20 text-left max-w-lg mx-auto mb-8">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0 mt-1" />
          <p className="text-xs text-slate-400 leading-relaxed">
            <span className="text-red-300 font-semibold">Feb 2026 — $388K oracle exploit: </span>
            @ploutos_money drained after using a BTC/USD feed to price USDC collateral.
            Pyth&apos;s CI would have flagged the mismatch instantly.{" "}
            <Link href="/learn" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
              See the full breakdown →
            </Link>
          </p>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/dashboard/calibration" className="btn-primary text-base px-6 py-3">
            View Oracle Health Scores →
          </Link>
          <Link href="/dashboard/feeds" className="btn-secondary text-base px-6 py-3">
            Live Price Feeds
          </Link>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-white/8 bg-white/8 mb-16">
        {[
          { value: "1,400+",  label: "Live feeds"            },
          { value: "3s",      label: "Price update interval" },
          { value: "0–100",   label: "Calibration score"     },
        ].map((s) => (
          <div key={s.label} className="bg-[rgb(17,17,25)] px-6 py-5 flex flex-col items-center gap-1">
            <div className="text-2xl font-bold text-white tabular-nums">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Feature grid ──────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        <FeatureCard
          icon={<IconTarget />}
          iconBg="bg-purple-950/60"
          iconColor="text-purple-400"
          title="CI Calibration Analysis"
          description="We ran months of Pyth Benchmarks data through a statistical calibration test. Does the ±1σ CI actually capture 68% of future price moves? The answer varies by asset."
          href="/dashboard/calibration"
          tag="Flagship · Pyth Benchmarks"
          tagColor="text-purple-400"
          live
        />
        <FeatureCard
          icon={<IconFeed />}
          iconBg="bg-cyan-950/60"
          iconColor="text-cyan-400"
          title="Live Price Feeds"
          description="Every price feed on Pyth Hermes — crypto, forex, metals & more — streamed live at 1-second intervals. Each card shows live confidence intervals and oracle certainty in real time."
          href="/dashboard/feeds"
          tag="Pyth Hermes"
          tagColor="text-cyan-400"
          live
        />
        <FeatureCard
          icon={<IconAI />}
          iconBg="bg-green-950/60"
          iconColor="text-green-400"
          title="AI Oracle Analyst"
          description="Ask anything about Pyth's price data or calibration results in plain English. Injected with live prices, CI widths, and anomaly signals from all connected Pyth feeds in real time."
          href="/ai"
          tag="Gemini · Claude"
          tagColor="text-green-400"
        />
        <FeatureCard
          icon={<IconVolatility />}
          iconBg="bg-orange-950/60"
          iconColor="text-orange-400"
          title="Volatility Intelligence"
          description="7-day realized volatility rankings and CI width trend analysis across all tracked assets — is the oracle becoming more or less certain about prices over time?"
          href="/dashboard/volatility"
          tag="Pyth Benchmarks"
          tagColor="text-orange-400"
        />
        <FeatureCard
          icon={<IconGame />}
          iconBg="bg-pink-950/60"
          iconColor="text-pink-400"
          title="Oracle Challenge"
          description="A provably fair prediction game powered by Pyth Entropy. Random historical price moments are selected on-chain — can you beat the oracle's confidence band?"
          href="/game"
          tag="Pyth Entropy"
          tagColor="text-pink-400"
        />
        <FeatureCard
          icon={<IconLearn />}
          iconBg="bg-yellow-950/60"
          iconColor="text-yellow-400"
          title="Learn Pyth"
          description="Interactive guides: how the pull oracle works, what confidence intervals really mean, how Entropy generates verifiable randomness, and how to use Benchmarks data."
          href="/learn"
          tag="Education"
          tagColor="text-yellow-400"
        />
      </div>

      {/* ── The question ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-purple-800/40 bg-purple-950/15 p-10 text-center">
        <div className="text-xs text-purple-400 font-medium tracking-wide uppercase mb-4">
          The question every DeFi protocol silently asks
        </div>
        <h2 className="text-2xl font-bold text-white mb-4 max-w-2xl mx-auto leading-snug">
          Pyth publishes a confidence interval with every price update.
          But is it actually calibrated?
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-4 text-sm leading-relaxed">
          A perfectly calibrated oracle&apos;s ±1σ band should capture exactly 68.3% of future
          price moves. We ran the numbers across months of historical data — the results are
          more interesting than you&apos;d expect.
        </p>
        <p className="text-slate-500 max-w-md mx-auto mb-8 text-xs leading-relaxed">
          The same CI that answers this question also prevents oracle exploits like the{" "}
          <Link href="/learn" className="text-red-400 hover:text-red-300">
            $388K @ploutos_money attack
          </Link>{" "}
          — where a mismatched feed was priced at $80,000 instead of $1.00.
        </p>
        <Link href="/dashboard/calibration" className="btn-primary px-6 py-3">
          See the calibration results →
        </Link>
      </div>
    </div>
  );
}
