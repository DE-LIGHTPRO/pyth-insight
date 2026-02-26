"use client";

import { useEffect, useRef, memo } from "react";
import { type LivePrice } from "@/lib/stores/priceStore";
import { formatPrice, formatConf, formatAge, confLabel } from "@/lib/pyth/hermes";

// ── Asset metadata ────────────────────────────────────────────────────────────
// Token icons sourced from the cryptocurrency-icons package via jsDelivr CDN.
// These load directly in the browser — no proxy restriction.
// Fallback: clean monogram badge using the first 2–3 letters of the base symbol.

const CDN = "https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color";

const ASSET_META: Record<string, { icon: string; color: string; bg: string }> = {
  "BTC/USD":   { icon: `${CDN}/btc.svg`,   color: "text-orange-400", bg: "bg-orange-950/50" },
  "ETH/USD":   { icon: `${CDN}/eth.svg`,   color: "text-blue-400",   bg: "bg-blue-950/50"   },
  "SOL/USD":   { icon: `${CDN}/sol.svg`,   color: "text-purple-400", bg: "bg-purple-950/50" },
  "BNB/USD":   { icon: `${CDN}/bnb.svg`,   color: "text-yellow-400", bg: "bg-yellow-950/50" },
  "AVAX/USD":  { icon: `${CDN}/avax.svg`,  color: "text-red-400",    bg: "bg-red-950/50"    },
  // POL/USD removed — feed ID was malformed (63 chars instead of 64); pending re-verification
  "ARB/USD":   { icon: `${CDN}/arb.svg`,   color: "text-sky-400",    bg: "bg-sky-950/50"    },
  "OP/USD":    { icon: `${CDN}/op.svg`,    color: "text-rose-400",   bg: "bg-rose-950/50"   },
  "LINK/USD":  { icon: `${CDN}/link.svg`,  color: "text-blue-300",   bg: "bg-blue-950/50"   },
  "UNI/USD":   { icon: `${CDN}/uni.svg`,   color: "text-pink-400",   bg: "bg-pink-950/50"   },
  "AAVE/USD":  { icon: `${CDN}/aave.svg`,  color: "text-purple-300", bg: "bg-purple-950/50" },
  "CRV/USD":   { icon: `${CDN}/crv.svg`,   color: "text-yellow-300", bg: "bg-yellow-950/50" },
  // MKR/USD deprecated on Hermes — removed
  "SNX/USD":   { icon: `${CDN}/snx.svg`,   color: "text-cyan-400",   bg: "bg-cyan-950/50"   },
  "DOGE/USD":  { icon: `${CDN}/doge.svg`,  color: "text-yellow-400", bg: "bg-yellow-950/50" },
  "LTC/USD":   { icon: `${CDN}/ltc.svg`,   color: "text-slate-300",  bg: "bg-slate-800/50"  },
  "XRP/USD":   { icon: `${CDN}/xrp.svg`,   color: "text-blue-300",   bg: "bg-blue-950/50"   },
  "ADA/USD":   { icon: `${CDN}/ada.svg`,   color: "text-sky-400",    bg: "bg-sky-950/50"    },
  "DOT/USD":   { icon: `${CDN}/dot.svg`,   color: "text-pink-400",   bg: "bg-pink-950/50"   },
  "ATOM/USD":  { icon: `${CDN}/atom.svg`,  color: "text-violet-300", bg: "bg-violet-950/50" },
};

const CONF_COLORS = {
  tight:   { bar: "bg-emerald-500", text: "text-emerald-400", badge: "bg-emerald-950 text-emerald-400 border-emerald-800" },
  normal:  { bar: "bg-sky-500",     text: "text-sky-400",     badge: "bg-sky-950 text-sky-400 border-sky-800"             },
  wide:    { bar: "bg-amber-500",   text: "text-amber-400",   badge: "bg-amber-950 text-amber-400 border-amber-800"       },
  extreme: { bar: "bg-red-500",     text: "text-red-400",     badge: "bg-red-950 text-red-400 border-red-800"             },
};

// ── Token icon with monogram fallback ─────────────────────────────────────────

function TokenIcon({ symbol, meta }: { symbol: string; meta: typeof ASSET_META[string] }) {
  const base = symbol.split("/")[0];

  return (
    <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center overflow-hidden flex-shrink-0`}>
      <img
        src={meta.icon}
        alt={base}
        width={22}
        height={22}
        className="object-contain"
        onError={(e) => {
          // If CDN icon fails, replace with clean monogram text
          const target = e.currentTarget;
          target.style.display = "none";
          const parent = target.parentElement;
          if (parent && !parent.querySelector(".monogram")) {
            const span = document.createElement("span");
            span.className = `monogram text-xs font-bold tracking-wide ${meta.color}`;
            span.textContent = base.slice(0, 3);
            parent.appendChild(span);
          }
        }}
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  price: LivePrice;
}

function PriceFeedCard({ price }: Props) {
  const cardRef     = useRef<HTMLDivElement>(null);
  const prevFlashRef = useRef<number | null>(null);

  const meta    = ASSET_META[price.symbol] ?? { icon: "", color: "text-slate-400", bg: "bg-slate-800/50" };
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

    const el = cardRef.current;
    const flashClass = price.direction === "up" ? "flash-up" : "flash-down";
    el.classList.remove("flash-up", "flash-down");
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add(flashClass);
    const timer = setTimeout(() => el.classList.remove(flashClass), 600);
    return () => clearTimeout(timer);
  }, [price.flashAt, price.direction]);

  const barPct = Math.min((price.confPct / 1) * 100, 100);
  const [base] = price.symbol.split("/");

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 transition-all duration-200 hover:border-white/15 hover:bg-[rgb(20,20,30)] group cursor-default"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <TokenIcon symbol={price.symbol} meta={meta} />
          <div>
            <div className="font-semibold text-white text-sm leading-none mb-0.5">{base}</div>
            <div className="text-xs text-slate-500 font-mono">{price.symbol}</div>
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-slate-600 font-mono tabular-nums">
          {formatAge(price.publishTime)}
        </span>
      </div>

      {/* Price + change row */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-mono font-bold text-xl text-white tracking-tight tabular-nums">
          ${formatPrice(price.price)}
        </div>

        {pctDev !== null && (
          <div className={`flex items-center gap-0.5 text-xs font-mono font-medium tabular-nums ${
            pctDev > 0 ? "text-emerald-400" : pctDev < 0 ? "text-red-400" : "text-slate-500"
          }`}>
            <svg
              className="w-2.5 h-2.5"
              viewBox="0 0 10 10"
              fill="currentColor"
            >
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

      {/* CI Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Confidence Interval</span>
          <span className={`text-xs font-mono ${colors.text} tabular-nums`}>
            ±${formatPrice(price.conf)} · {formatConf(price.confPct)}
          </span>
        </div>

        {/* CI bar */}
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

      {/* Update counter — visible on hover only */}
      {price.updateCount > 0 && (
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-xs text-slate-600 font-mono">{price.updateCount}×</span>
        </div>
      )}
    </div>
  );
}

export default memo(PriceFeedCard, (prev, next) =>
  prev.price.price    === next.price.price &&
  prev.price.conf     === next.price.conf  &&
  prev.price.flashAt  === next.price.flashAt
);
