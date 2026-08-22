import { useEffect, useRef, useState } from "react";
import { indicesDataEngine } from "@/bots/indices-data";
import { IndicesStrategyEngine } from "./engine";
import type { StrategySignal } from "./types";

const strategyEngine = new IndicesStrategyEngine(indicesDataEngine);

export function useIndicesStrategy(active: boolean, onSignal?: (signal: StrategySignal) => void) {
  const [opportunityCount, setOpportunityCount] = useState(0);
  const onSignalRef = useRef(onSignal);
  onSignalRef.current = onSignal;
  useEffect(() => {
    if (!active) { strategyEngine.stop(); setOpportunityCount(0); return; }
    const removeData = strategyEngine.start();
    const removeSignals = strategyEngine.scanner.onEvent((event) => {
      setOpportunityCount(strategyEngine.scanner.getBestOpportunities().length);
      if (event.type === "SIGNAL_READY") onSignalRef.current?.(event.payload);
    });
    return () => { removeData?.(); removeSignals(); strategyEngine.stop(); };
  }, [active]);
  return { opportunityCount, scanner: strategyEngine.scanner };
}