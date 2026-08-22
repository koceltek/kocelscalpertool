import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { authenticatedTradingRequest } from "@/lib/trading.functions";
import type { BotSettings } from "@/bots/settings";
import type { StrategySignal } from "@/bots/strategy/types";
import { ForexExecutionEngine } from "./engine";
import type { ForexExecutionStatus } from "./types";

export function useForexExecution(
  active: boolean,
  autoTrading: boolean,
  settings: BotSettings,
  balance: number | null,
  currency: string,
  refreshBalance: () => void,
) {
  const request = useServerFn(authenticatedTradingRequest);
  const engineRef = useRef<ForexExecutionEngine | null>(null);
  const refreshBalanceRef = useRef(refreshBalance);
  refreshBalanceRef.current = refreshBalance;
  if (!engineRef.current) {
    engineRef.current = new ForexExecutionEngine(async (operation, payload) => {
      const result = (await request({ data: { operation, payload } })) as {
        response: Record<string, unknown>;
      };
      return result.response;
    }, settings);
  }
  const engine = engineRef.current;
  const [status, setStatus] = useState<ForexExecutionStatus>(() => engine.getStatus());
  useEffect(() => {
    const remove = engine.onEvent((event) => {
      setStatus(engine.getStatus());
      if (event.type === "CONTRACT_CLOSED" || event.type === "TRADE_RECORDED")
        refreshBalanceRef.current();
    });
    if (active) {
      engine.start();
      void engine
        .reconcile()
        .then(() => setStatus(engine.getStatus()))
        .catch(() => undefined);
    } else engine.stop();
    setStatus(engine.getStatus());
    return () => {
      remove();
      if (active) engine.stop();
    };
  }, [active, engine]);
  useEffect(() => {
    if (!active || !autoTrading) return;
  }, [active, autoTrading]);
  const executeSignal = (signal: StrategySignal) => {
    if (!autoTrading) return;
    void engine.executeSignal(signal, balance, currency).then(() => setStatus(engine.getStatus()));
  };
  return { status, engine, executeSignal };
}
