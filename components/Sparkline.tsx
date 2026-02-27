/**
 * Sparkline — inline micro price chart
 *
 * Pure SVG, no charting library. Smooth bezier curve with gradient fill.
 * Color is green when price is up over 24h, red when down.
 * Designed to sit inside PriceFeedCard without adding bundle weight.
 */

"use client";

import { useMemo, useId } from "react";

export interface SparklinePoint {
  t: number; // unix timestamp
  c: number; // close price
}

interface SparklineProps {
  points:    SparklinePoint[];
  change24h: number;
  width?:    number;
  height?:   number;
}

export default function Sparkline({
  points,
  change24h,
  width  = 120,
  height = 36,
}: SparklineProps) {
  const uid    = useId();
  const gradId = `sg${uid.replace(/:/g, "")}`;

  const paths = useMemo(() => {
    if (points.length < 3) return null;

    const prices = points.map((p) => p.c);
    const min    = Math.min(...prices);
    const max    = Math.max(...prices);
    const range  = max - min || max * 0.001 || 1;
    const pad    = 3;

    const coords = prices.map((p, i) => ({
      x: (i / (prices.length - 1)) * width,
      y: pad + (1 - (p - min) / range) * (height - pad * 2),
    }));

    // Smooth bezier path
    let line = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const cpx  = ((prev.x + curr.x) / 2).toFixed(1);
      line += ` C ${cpx},${prev.y.toFixed(1)} ${cpx},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
    }

    const last = coords[coords.length - 1];
    const fill =
      line +
      ` L ${last.x.toFixed(1)},${height} L ${coords[0].x.toFixed(1)},${height} Z`;

    return { line, fill };
  }, [points, width, height]);

  if (!paths) return null;

  const up    = change24h >= 0;
  const color = up ? "#10b981" : "#ef4444"; // emerald-500 / red-500

  return (
    <div className="flex items-end gap-2 w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="flex-shrink-0 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0"   />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={paths.fill} fill={`url(#${gradId})`} />
        {/* Line */}
        <path
          d={paths.line}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* 24h % label */}
      <span
        className={`text-[11px] font-mono font-semibold tabular-nums flex-shrink-0 ${
          up ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {up ? "+" : ""}
        {change24h.toFixed(2)}%
      </span>
    </div>
  );
}

/* ── Skeleton shown while sparkline is loading ─────────────────────────────── */
export function SparklineSkeleton() {
  return (
    <div className="flex items-end gap-2 w-full">
      <div className="h-9 flex-1 rounded bg-white/4 animate-pulse" />
      <div className="w-12 h-3 rounded bg-white/4 animate-pulse flex-shrink-0" />
    </div>
  );
}
