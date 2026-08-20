/**
 * Phase 2 UI data contracts.
 *
 * These interfaces are the plug-in points for the future engines:
 *   Forex   — Data Engine (Phase 3), Strategy Engine (Phase 4)
 *   Indices — Data Engine (Phase 3), Strategy Engine (Phase 5)
 *   Shared  — Execution Engine (Phase 6), Risk Engine (Phase 7)
 *
 * Nothing in Phase 2 populates them: the UI renders explicit placeholders
 * instead of fabricated prices, signals, trades or statistics.
 */

export type BotType = "forex" | "indices";

export const BOT_LABEL: Record<BotType, string> = {
  forex: "Forex Scalper Bot",
  indices: "Indices Scalper Bot",
};

export type SignalDirection = "RISE" | "FALL";

export type EngineStatus =
  | "not_active"
  | "idle"
  | "scanning"
  | "analyzing"
  | "signal_ready"
  | "entering"
  | "trade_active"
  | "cooldown"
  | "paused"
  | "risk_locked"
  | "disconnected";

/** Contract the Phase 3 Forex data engine + Phase 4 strategy engine will return. */
export interface ForexAnalysisResult {
  botType: "forex";
  market: string;
  timestamp: number;
  price: number | null;
  trend: string | null;
  momentum: string | null;
  volatility: string | null;
  structure: string | null;
  multiTimeframe: string | null;
  entry: string | null;
  direction: SignalDirection | null;
  confidence: number | null;
  duration: number | null;
  status: EngineStatus;
}

/** Contract the Phase 3 Indices data engine + Phase 5 strategy engine will return. */
export interface IndicesAnalysisResult {
  botType: "indices";
  market: string;
  timestamp: number;
  price: number | null;
  tickMomentum: string | null;
  tickVelocity: string | null;
  directionalPressure: string | null;
  microTrend: string | null;
  volatility: string | null;
  exhaustion: string | null;
  entry: string | null;
  direction: SignalDirection | null;
  confidence: number | null;
  duration: number | null;
  status: EngineStatus;
}

export type BotAnalysisResult = ForexAnalysisResult | IndicesAnalysisResult;

/** Contract for the Phase 6 execution engine. */
export interface BotTrade {
  botType: BotType;
  contractId: string;
  market: string;
  direction: SignalDirection;
  stake: number;
  durationSeconds: number;
  entryPrice: number | null;
  openedAt: number;
  closedAt: number | null;
  result: "won" | "lost" | "open";
  profitLoss: number | null;
}

/** Per-bot statistics. Never shared between bots. */
export interface BotStats {
  botType: BotType;
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  profit: number;
  loss: number;
  netResult: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  dailyLoss: number;
}

export function emptyStats(botType: BotType): BotStats {
  return {
    botType,
    trades: 0,
    wins: 0,
    losses: 0,
    winRate: null,
    profit: 0,
    loss: 0,
    netResult: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    dailyLoss: 0,
  };
}

/** Placeholder used everywhere a future engine will supply a value. */
export const NO_VALUE = "--";
