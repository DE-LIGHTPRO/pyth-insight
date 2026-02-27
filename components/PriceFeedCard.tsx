"use client";

import { useEffect, useRef, useState, memo } from "react";
import useSWR                                from "swr";
import { type LivePrice }                    from "@/lib/stores/priceStore";
import { formatPrice, formatConf, formatAge, confLabel } from "@/lib/pyth/hermes";
import Sparkline, { SparklineSkeleton, type SparklinePoint } from "./Sparkline";
import { type SparklineResponse }            from "@/app/api/sparkline/route";

// ── Asset type badge colours ───────────────────────────────────────────────────
const TYPE_BADGE: Record<string, string> = {
  crypto: "bg-purple-950/60 text-purple-400 border-purple-800/50",
  fx:     "bg-blue-950/60   text-blue-400   border-blue-800/50",
  metal:  "bg-yellow-950/60 text-yellow-400 border-yellow-800/50",
  equity: "bg-green-950/60  text-green-400  border-green-800/50",
};

// ── CI classification colours ──────────────────────────────────────────────────
const CONF_COLORS = {
  tight:   { bar: "bg-emerald-500", text: "text-emerald-400", badge: "bg-emerald-950 text-emerald-400 border-emerald-800" },
  normal:  { bar: "bg-sky-500",     text: "text-sky-400",     badge: "bg-sky-950 text-sky-400 border-sky-800"             },
  wide:    { bar: "bg-amber-500",   text: "text-amber-400",   badge: "bg-amber-950 text-amber-400 border-amber-800"       },
  extreme: { bar: "bg-red-500",     text: "text-red-400",     badge: "bg-red-950 text-red-400 border-red-800"             },
};

// ── Consistent colour palette derived from symbol string ──────────────────────
const PALETTE = [
  { color: "text-orange-400", bg: "bg-orange-950/50" },
  { color: "text-blue-400",   bg: "bg-blue-950/50"   },
  { color: "text-purple-400", bg: "bg-purple-950/50" },
  { color: "text-emerald-400",bg: "bg-emerald-950/50"},
  { color: "text-rose-400",   bg: "bg-rose-950/50"   },
  { color: "text-cyan-400",   bg: "bg-cyan-950/50"   },
  { color: "text-yellow-400", bg: "bg-yellow-950/50" },
  { color: "text-pink-400",   bg: "bg-pink-950/50"   },
  { color: "text-sky-400",    bg: "bg-sky-950/50"    },
  { color: "text-violet-400", bg: "bg-violet-950/50" },
  { color: "text-lime-400",   bg: "bg-lime-950/50"   },
  { color: "text-teal-400",   bg: "bg-teal-950/50"   },
];

function symbolColor(sym: string) {
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// ── Token icon with CDN lookup + monogram fallback ────────────────────────────
const CDN = "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color";

function TokenIcon({ base, assetType }: { base: string; assetType: string }) {
  const { color, bg } = symbolColor(base);
  const iconUrl = `${CDN}/${base.toLowerCase()}.svg`;
  const skipCDN = assetType !== "crypto";

  return (
    <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {skipCDN ? (
        <span className={`text-xs font-bold tracking-wide ${color}`}>
          {base.slice(0, 3)}
        </span>
      ) : (
        <img
          src={iconUrl}
          alt={base}
          width={22}
          height={22}
          className="object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent && !parent.querySelector(".monogram")) {
              const span = document.createElement("span");
              span.className = `monogram text-xs font-bold tracking-wide ${color}`;
              span.textContent = base.slice(0, 3);
              parent.appendChild(span);
            }
          }}
        />
      )}
    </div>
  );
}

// ── Sparkline loader — lazy via IntersectionObserver ──────────────────────────
// Only fires the SWR fetch once the card scrolls into view.
// Only runs for crypto feeds (Benchmarks has full 24h coverage for crypto).

const sparklineFetcher = (url: string) =>
  fetch(url).then((r) => (r.ok ? (r.json() as Promise<SparklineResponse>) : null));

function SparklineSection({ pythSymbol }: { pythSymbol: string }) {
  const triggerRef              = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled]   = useState(false);

  // Observe visibility — enable SWR only when card enters viewport
  useEffect(() => {
    if (!triggerRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setEnabled(true); },
      { threshold: 0.1, rootMargin: "100px" }
    );
    obs.observe(triggerRef.current);
    return () => obs.disconnect();
  }, []);

  const url = enabled && pythSymbol
    ? `/api/sparkline?symbol=${encodeURIComponent(pythSymbol)}`
    : null;

  const { data } = useSWR<SparklineResponse | null>(url, sparklineFetcher, {
    revalidateOnFocus:    false,
    revalidateOnReconnect: false,
    dedupingInterval:     300_000, // 5 min — matches server cache
    shouldRetryOnError:   false,
  });

  return (
    <div ref={triggerRef} className="mt-3 pt-3 border-t border-white/5">
      {!enabled || !data ? (
        <SparklineSkeleton />
      ) : (
        <Sparkline
          points={data.points as SparklinePoint[]}
          change24h={data.change24h}
          width={120}
          height={36}
        />
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  price: LivePrice;
}

function PriceFeedCard({ price }: Props) {
  const cardRef      = useRef<HTMLDivElement>(null);
  const prevFlashRef = useRef<number | null>(null);

  const label   = confLabel(price.confPct);
  const colors  = CONF_COLORS[label];
  const pctDev  = price.prevPrice
    ? ((price.price - price.prevPrice) / price.prevPrice) * 100
    : null;

  // Flash animation on price change
  useEffect(() => {
    if (!cardRef.current || !price.flashAt) return;
    if (price.flashAt === prevFlashRef.current) return;
    prevFlashRef.current = price.flashAt;

    const el         = cardRef.current;
    const flashClass = price.direction === "up" ? "flash-up" : "flash-down";
    el.classList.remove("flash-up", "flash-down");
    void el.offsetWidth;
    el.classList.add(flashClass);
    const timer = setTimeout(() => el.classList.remove(flashClass), 600);
    return () => clearTimeout(timer);
  }, [price.flashAt, price.direction]);

  const barPct    = Math.min((price.confPct / 1) * 100, 100);
  const base      = price.base || price.symbol.split("/")[0];
  const assetType = price.assetType ?? "crypto";
  const typeBadge = TYPE_BADGE[assetType] ?? "bg-slate-800/60 text-slate-400 border-slate-700/50";

  // Sparklines: crypto feeds only (Benchmarks TradingView shim covers crypto 24/7)
  const showSparkline = assetType === "crypto" && !!price.pythSymbol;

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 transition-all duration-200 hover:border-white/15 hover:bg-[rgb(20,20,30)] group cursor-default"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <TokenIcon base={base} assetType={assetType} />
          <div>
            <div className="font-semibold text-white text-sm leading-none mb-0.5">{base}</div>
            <div className="text-xs text-slate-500 font-mono">{price.symbol}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide ${typeBadge}`}>
            {assetType}
          </span>
          <span className="text-xs text-slate-600 font-mono tabular-nums">
            {formatAge(price.publishTime)}
          </span>
        </div>
      </div>

      {/* Price + live change row */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-mono font-bold text-xl text-white tracking-tight tabular-nums">
          ${formatPrice(price.price)}
        </div>

        {pctDev !== null && (
          <div className={`flex items-center gap-0.5 text-xs font-mono font-medium tabular-nums ${
            pctDev > 0 ? "text-emerald-400" : pctDev < 0 ? "text-red-400" : "text-slate-500"
          }`}>
            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="currentColor">
              {pctDev > 0
                ? <polygon points="5,1 9,9 1,9" />
                : pctDev < 0
                ? <polygon points="5,9 9,1 1,1" />
                : <rect x="1" y="4" width="8" height="2" />
              }
            </svg>
            {pctDev !== 0 && Math.abs(pctDev).toFixed(4) + "%"}
          </div>
        )}
      </div>

      {/* CI section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Confidence Interval</span>
          <span className={`text-xs font-mono ${colors.text} tabular-nums`}>
            ±${formatPrice(price.conf)} · {formatConf(price.confPct)}
          </span>
        </div>

        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${Math.max(barPct, 2)}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className={`inline-flex text-xs px-1.5 py-0.5 rounded border font-medium ${colors.badge}`}>
            {label}
          </span>
          <span className="text-xs text-slate-600 font-mono tabular-nums">
            EMA ${formatPrice(price.emaPrice)}
          </span>
        </div>
      </div>

      {/* 24h sparkline — lazy loaded, crypto only */}
      {showSparkline && <SparklineSection pythSymbol={price.pythSymbol} />}

      {/* Update counter — hover only */}
      {price.updateCount > 0 && (
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs text-slate-600 font-mono">{price.updateCount}×</span>
        </div>
      )}
    </div>
  );
}

export default memo(PriceFeedCard, (prev, next) =>
  prev.price.price      === next.price.price      &&
  prev.price.conf       === next.price.conf        &&
  prev.price.flashAt    === next.price.flashAt     &&
  prev.price.pythSymbol === next.price.pythSymbol
);
