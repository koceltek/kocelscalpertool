import { useEffect, useRef, useState } from "react";
import { forexStrategyEngine } from "./forex-strategy-engine";
import type { StrategySignal } from "./types";

export function useForexStrategy(
  active = false,
  selectedMarkets?: string[],
  onSignal?: (signal: StrategySignal) => void,
) {
  const [health, setHealth] = useState(() => forexStrategyEngine.getHealth());
  const onSignalRef = useRef(onSignal);
  onSignalRef.current = onSignal;
  useEffect(() => {
    const remove = forexStrategyEngine.onEvent((event) => {
      setHealth(forexStrategyEngine.getHealth());
      if (event.type === "SIGNAL_READY" && event.signal) onSignalRef.current?.(event.signal);
    });
    if (active) forexStrategyEngine.start(selectedMarkets);
    else forexStrategyEngine.stop();
    setHealth(forexStrategyEngine.getHealth());
    return () => {
      remove();
      if (active) forexStrategyEngine.stop();
    };
  }, [active, selectedMarkets]);
  return { ...health, engine: forexStrategyEngine };
}
