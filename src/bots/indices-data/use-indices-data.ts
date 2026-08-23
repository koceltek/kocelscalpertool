import { useEffect, useState } from "react";
import { indicesDataEngine } from "./engine";

export function useIndicesData(active = false, configuredSymbols?: string[]) {
  const [snapshot, setSnapshot] = useState(() => indicesDataEngine.getSnapshot());
  useEffect(() => {
    const remove = indicesDataEngine.onEvent(() => setSnapshot(indicesDataEngine.getSnapshot()));
    if (active) void indicesDataEngine.start(configuredSymbols).catch(() => setSnapshot(indicesDataEngine.getSnapshot()));
    return remove;
  }, [active, configuredSymbols]);
  useEffect(() => { if (active) return; if (indicesDataEngine.isRunning) indicesDataEngine.stop(); }, [active]);
  return { ...snapshot, engine: indicesDataEngine, refresh: () => setSnapshot(indicesDataEngine.getSnapshot()) };
}
