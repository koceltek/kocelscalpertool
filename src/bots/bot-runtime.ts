import { useCallback, useEffect, useRef, useState } from "react";

import type { BotType } from "./contracts";

/**
 * Runtime (run/stop) state for a single bot.
 *
 * Each bot keeps its own record — there is deliberately no global bot status,
 * so Forex can be RUNNING while Indices is STOPPED and vice versa.
 */
export type BotRunState =
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error"
  | "disconnected";

export const RUN_STATE_LABEL: Record<BotRunState, string> = {
  stopped: "Bot stopped",
  starting: "Starting bot...",
  running: "Bot running",
  stopping: "Stopping bot...",
  error: "Bot error",
  disconnected: "Deriv disconnected",
};

/** What the bot is doing right now, as far as the UI needs to know. */
export type BotActivity = "idle" | "scanning" | "waiting_entry" | "trade_active" | "cooldown";

export const ACTIVITY_LABEL: Record<BotActivity, string> = {
  idle: "Bot stopped.",
  scanning: "Bot is scanning for the next trade...",
  waiting_entry: "Waiting for a valid setup...",
  trade_active: "Trade active",
  cooldown: "Cooldown active",
};

/** The deliberately small engine-to-UI contract; strategy internals stay hidden. */
export interface BotRuntimeSnapshot {
  botType: BotType;
  state: BotRunState;
  activity: BotActivity;
  currentMarket: string | null;
  botAction: string | null;
  nextAction: string | null;
  /** Populated by the Phase 6 execution engine. */
  currentTrade: {
    market: string;
    direction: "RISE" | "FALL";
    stake: number;
    duration: string;
    entry: string | null;
    contractStatus: string;
  } | null;
  todayTrades: number;
  wins: number;
  losses: number;
  todayProfitLoss: number;
}

export function emptySnapshot(botType: BotType, state: BotRunState = "stopped"): BotRuntimeSnapshot {
  return {
    botType,
    state,
    activity: state === "running" ? "scanning" : "idle",
    currentMarket: null,
    botAction: null,
    nextAction: null,
    currentTrade: null,
    todayTrades: 0,
    wins: 0,
    losses: 0,
    todayProfitLoss: 0,
  };
}

/**
 * Bot-scoped lifecycle gate. Domain engines are started by their bot-specific
 * hooks, while this controller owns the user-visible lifecycle and connection
 * safety state.
 */
export function useBotRuntime(botType: BotType, connected: boolean) {
  const [state, setState] = useState<BotRunState>("stopped");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // A dropped connection surfaces as its own state without discarding history,
  // statistics or settings.
  useEffect(() => {
    if (!connected) {
      setState((current) => (current === "running" || current === "starting" ? "disconnected" : current));
    } else {
      setState((current) => (current === "disconnected" ? "stopped" : current));
    }
  }, [connected]);

  const start = useCallback(() => {
    if (!connected) {
      setState("disconnected");
      return;
    }
    setState("starting");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("running"), 600);
  }, [connected]);

  const stop = useCallback(() => {
    if (state === "stopped" || state === "stopping") return;
    setState("stopping");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("stopped"), 400);
  }, [state]);

  const snapshot = emptySnapshot(botType, state);
  const busy = state === "starting" || state === "stopping";

  return { state, snapshot, busy, start, stop };
}
