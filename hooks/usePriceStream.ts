"use client";

import { useEffect } from "react";
import { usePriceStore } from "@/lib/stores/priceStore";

/**
 * Initialises the Pyth Hermes REST polling loop (500ms interval) and cleans up on unmount.
 * Safe to call from multiple components — the store singleton prevents double-init.
 */
export function usePriceStream() {
  const initStream = usePriceStore((s) => s.initStream);
  const cleanup    = usePriceStore((s) => s.cleanup);
  const status     = usePriceStore((s) => s.status);
  const lastUpdateAt  = usePriceStore((s) => s.lastUpdateAt);
  const totalUpdates  = usePriceStore((s) => s.totalUpdates);

  useEffect(() => {
    initStream();
    return () => {
      // Only clean up when the entire app unmounts, not on re-renders
      // Comment this out if you want prices to persist across page navigation
      // cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, lastUpdateAt, totalUpdates, cleanup };
}
