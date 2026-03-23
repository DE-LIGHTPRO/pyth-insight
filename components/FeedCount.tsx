"use client";

/**
 * FeedCount — dynamically fetches the total number of available Pyth price
 * feeds from /api/feeds (which proxies Hermes /v2/price_feeds, ISR-cached 1h)
 * and renders it as a formatted string like "1,687+".
 *
 * Falls back to "1,600+" on error so the homepage never shows a blank stat.
 */

import { useState, useEffect } from "react";

const FALLBACK = "1,600+";

export default function FeedCount() {
  const [count, setCount] = useState<string>(FALLBACK);

  useEffect(() => {
    fetch("/api/feeds")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((feeds: unknown) => {
        if (Array.isArray(feeds) && feeds.length > 0) {
          setCount(feeds.length.toLocaleString() + "+");
        }
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  return <>{count}</>;
}
