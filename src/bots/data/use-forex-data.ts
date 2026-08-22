import { useEffect, useRef, useState } from "react";

import { forexMarketDataService } from "./forex-data-service";
import type { ForexDataSnapshot } from "./types";

/** Snapshots are throttled so raw ticks never re-render the whole app. */
const SNAPSHOT_THROTTLE_MS = 1_000;

/**
 * Acquires the shared Forex data engine while `enabled` is true and exposes a
 * throttled snapshot of its state.
 */
export function useForexData(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<ForexDataSnapshot>(() => forexMarketDataService.getSnapshot());
  const lastPush = useRef(0);
  const pending = useRef<ForexDataSnapshot | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(forexMarketDataService.getSnapshot());
      return;
    }

    const release = forexMarketDataService.acquire();
    let cancelled = false;

    const push = (next: ForexDataSnapshot) => {
      if (cancelled) return;
      const now = Date.now();
      const elapsed = now - lastPush.current;
      if (elapsed >= SNAPSHOT_THROTTLE_MS) {
        lastPush.current = now;
        pending.current = null;
        setSnapshot(next);
        return;
      }
      pending.current = next;
      if (flushTimer.current) return;
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        const queued = pending.current;
        pending.current = null;
        if (queued && !cancelled) {
          lastPush.current = Date.now();
          setSnapshot(queued);
        }
      }, SNAPSHOT_THROTTLE_MS - elapsed);
    };

    const unsubscribe = forexMarketDataService.onSnapshot(push);
    void forexMarketDataService.initialize();
    push(forexMarketDataService.getSnapshot());

    return () => {
      cancelled = true;
      unsubscribe();
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = null;
      release();
      forexMarketDataService.disconnect();
    };
  }, [enabled]);

  return snapshot;
}
