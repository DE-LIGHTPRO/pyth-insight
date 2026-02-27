"use client";

import { useMemo, useState, useCallback } from "react";

const PAGE_SIZE = 60; // cards rendered per page — keeps DOM lean and browser fast
import { usePriceStore }     from "@/lib/stores/priceStore";
import { usePriceStream }    from "@/hooks/usePriceStream";
import PriceFeedCard          from "@/components/PriceFeedCard";

type SortKey = "symbol" | "price" | "conf" | "change";

const SORT_LABELS: Record<SortKey, string> = {
  symbol: "Name",
  price:  "Price",
  conf:   "CI Width",
  change: "Change",
};

// Asset type filter tabs
const TYPE_FILTERS = [
  { key: "all",    label: "All"      },
  { key: "crypto", label: "Crypto"   },
  { key: "fx",     label: "Forex"    },
  { key: "metal",  label: "Metals"   },
  { key: "equity", label: "Equities" },
];

// Equities are only available via Pyth Pro (not the public Hermes endpoint)
const EQUITY_COUNT_IN_CATALOGUE = 1100; // approx from /v2/price_feeds catalogue

export default function PriceFeedGrid() {
  const { status, totalUpdates } = usePriceStream();
  const prices        = usePriceStore((s) => s.prices);
  const sortBy        = usePriceStore((s) => s.sortBy);
  const sortDir       = usePriceStore((s) => s.sortDir);
  const filterType    = usePriceStore((s) => s.filterType);
  const feeds         = usePriceStore((s) => s.feeds);
  const setSortBy     = usePriceStore((s) => s.setSortBy);
  const setFilterType = usePriceStore((s) => s.setFilterType);
  const getSorted     = usePriceStore((s) => s.getSortedPrices);

  const [search,      setSearch]      = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadMore = useCallback(() => setVisibleCount((n) => n + PAGE_SIZE), []);

  const sortedPrices = getSorted();

  const filtered = useMemo(() => {
    // Reset pagination whenever the filtered set changes
    setVisibleCount(PAGE_SIZE);
    if (!search) return sortedPrices;
    const q = search.toLowerCase();
    return sortedPrices.filter(
      (p) => p.symbol.toLowerCase().includes(q) || p.base.toLowerCase().includes(q)
    );
  }, [sortedPrices, search]);

  const connected = Object.keys(prices).length;
  const totalFeeds = feeds.length;

  // Count per asset type (for tab badges)
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: connected };
    Object.values(prices).forEach((p) => {
      const t = p.assetType ?? "other";
      counts[t] = (counts[t] ?? 0) + 1;
    });
    return counts;
  }, [prices, connected]);

  return (
    <div>
      {/* Asset type tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TYPE_FILTERS.map(({ key, label }) => {
          const count = typeCounts[key] ?? 0;
          if (key !== "all" && count === 0) return null; // hide empty categories
          return (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all font-medium ${
                filterType === key
                  ? "bg-purple-700 border-purple-600 text-white"
                  : "bg-white/5 border-white/8 text-slate-400 hover:text-white hover:border-white/15"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 text-[10px] ${filterType === key ? "text-purple-200" : "text-slate-600"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search feeds…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/8 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-600 transition-colors"
          />
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/8">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${
                sortBy === key
                  ? "bg-purple-700 text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {SORT_LABELS[key]}
              {sortBy === key && (
                <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>

        {/* Status pill */}
        <div className="ml-auto flex items-center gap-2">
          <StatusPill
            status={status}
            connected={connected}
            totalFeeds={totalFeeds}
            totalUpdates={totalUpdates}
          />
        </div>
      </div>

      {/* Loading / skeleton state */}
      {connected === 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-4">
            {totalFeeds > 0
              ? `Fetching prices for ${totalFeeds} feeds…`
              : "Discovering available Pyth feeds…"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 16 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Pyth Pro teaser — shown when Equities tab is selected */}
      {filterType === "equity" && (
        <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-8 text-center">
          <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-700/50 rounded-full px-4 py-1.5 mb-4">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-semibold text-purple-300 tracking-wide uppercase">Pyth Pro</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {EQUITY_COUNT_IN_CATALOGUE}+ Equity Feeds Available via Pyth Pro
          </h3>
          <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            Pyth Pro delivers real-time US equities, ETFs, and international indices at
            sub-millisecond latency — 2,200+ feeds total including the ones in this catalogue.
            Equity feeds require a Pyth Pro subscription and are not published to the free
            public Hermes endpoint.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6 text-xs text-slate-500">
            {["AAPL/USD","TSLA/USD","NVDA/USD","MSFT/USD","AMZN/USD","GOOGL/USD","META/USD","SPY/USD","QQQ/USD","GLD/USD"].map((sym) => (
              <span key={sym} className="px-2 py-1 rounded bg-white/5 border border-white/8 font-mono text-slate-400">{sym}</span>
            ))}
            <span className="px-2 py-1 rounded bg-white/5 border border-white/8 text-slate-500">+ 1,090 more</span>
          </div>
          <a
            href="https://docs.pyth.network/price-feeds/pro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Learn about Pyth Pro →
          </a>
        </div>
      )}

      {/* Price grid — paginated to keep DOM lean */}
      {connected > 0 && filterType !== "equity" && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              No feeds match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.slice(0, visibleCount).map((p) => (
                  <PriceFeedCard key={p.symbol} price={p} />
                ))}
              </div>

              {/* Load more */}
              {visibleCount < filtered.length && (
                <div className="flex flex-col items-center gap-2 mt-6">
                  <button
                    onClick={loadMore}
                    className="px-6 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/18 text-slate-300 text-sm font-medium transition-all duration-150"
                  >
                    Show more · {Math.min(PAGE_SIZE, filtered.length - visibleCount)} of{" "}
                    {filtered.length - visibleCount} remaining
                  </button>
                  <span className="text-xs text-slate-600">
                    Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} feeds
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusPill({
  status,
  connected,
  totalFeeds,
  totalUpdates,
}: {
  status: string;
  connected: number;
  totalFeeds: number;
  totalUpdates: number;
}) {
  if (status === "connecting" || connected === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        {totalFeeds > 0 ? `Loading ${totalFeeds} feeds…` : "Connecting to Pyth Hermes…"}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-400">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Reconnecting…
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <span className="flex items-center gap-1.5 text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Live · {connected} feeds
      </span>
      <span>{totalUpdates.toLocaleString()} updates</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/8 bg-[rgb(17,17,25)] p-4 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-lg bg-white/5" />
        <div className="space-y-1.5">
          <div className="w-16 h-3 bg-white/5 rounded" />
          <div className="w-24 h-2.5 bg-white/5 rounded" />
        </div>
      </div>
      <div className="w-32 h-6 bg-white/5 rounded mb-3" />
      <div className="space-y-2">
        <div className="w-full h-1.5 bg-white/5 rounded-full" />
        <div className="flex justify-between">
          <div className="w-12 h-4 bg-white/5 rounded" />
          <div className="w-20 h-4 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}
