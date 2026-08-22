import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import { authenticatedTradingRequest } from "@/lib/trading.functions";
import type { IndicesMarketSnapshot } from "@/bots/indices-data";
import type { StrategySignal } from "@/bots/indices-strategy";
import { IndicesExecutionEngine } from "./engine";
import type { RiskSettings } from "./types";

export function useIndicesExecution(
  active: boolean,
  autoTrading: boolean,
  settings: RiskSettings,
  getSnapshot: (symbol: string) => IndicesMarketSnapshot | null,
  balance: number | null,
  currency: string,
  onTradeClosed?: () => void,
) {
  const request = useServerFn(authenticatedTradingRequest);
  const engineRef = useRef<IndicesExecutionEngine | null>(null);
  const [status, setStatus] = useState(() => ({ botRunning: false, protection: "NORMAL" as const, message: "Stopped", activeTrade: null, dailyRealizedPnL: 0, consecutiveLosses: 0 }));
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const contextRef = useRef({ getSnapshot, balance, currency });
  contextRef.current = { getSnapshot, balance, currency };

  useEffect(() => {
    const tradingRequest = async (operation: Parameters<typeof request>[0]["operation"], payload: Record<string, unknown>) => {
      const result = await request({ data: { operation, payload } });
      return result.response;
    };
    const engine = new IndicesExecutionEngine(tradingRequest, settingsRef.current);
    engineRef.current = engine;
    const remove = engine.onEvent(() => setStatus(engine.getStatus()));
    return () => { remove(); engine.stop(); engineRef.current = null; };
  }, [request]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (active) {
      engine.start();
      void engine.recover().then(() => setStatus(engine.getStatus())).catch(() => undefined);
    } else engine.stop();
    return () => undefined;
  }, [active]);

  const executeSignal = async (signal: StrategySignal) => {
    if (!active || !autoTrading || !engineRef.current) return null;
    const context = contextRef.current;
    const snapshot = context.getSnapshot(signal.symbol);
    if (!snapshot) return null;
    const removeClosedListener = engineRef.current.onEvent((event) => {
      if (event.type === "CONTRACT_CLOSED") onTradeClosed?.();
    });
    const result = await engineRef.current.execute(signal, snapshot, context.balance, context.currency);
    removeClosedListener();
    setStatus(engineRef.current.getStatus());
    return result;
  };

  return { status, engine: engineRef.current, executeSignal };
}
