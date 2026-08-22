import type { ForexCandle } from "@/bots/data/types";

export type StrategyDirection = "RISE" | "FALL";

export type TrendState =
  | "STRONG_BULLISH"
  | "WEAK_BULLISH"
  | "NEUTRAL"
  | "WEAK_BEARISH"
  | "STRONG_BEARISH";

export type Bias = "BULLISH" | "BEARISH" | "NEUTRAL";

export type MomentumState = "STRONG_UP" | "WEAK_UP" | "NEUTRAL" | "WEAK_DOWN" | "STRONG_DOWN";

export type VolatilityRegime = "DEAD" | "LOW" | "NORMAL" | "EXPANDING" | "HIGH" | "EXTREME";

export type StructureState =
  | "BULLISH"
  | "BEARISH"
  | "RANGING"
  | "BREAKOUT_UP"
  | "BREAKOUT_DOWN"
  | "TRANSITION"
  | "UNKNOWN";

export type StrategyDecisionState =
  | "ANALYZING"
  | "NO_TRADE"
  | "SETUP_FORMING"
  | "SIGNAL_READY"
  | "INVALIDATED";

/** Pure input to the strategy — no WebSocket, so history can be replayed. */
export type MarketSnapshotInput = {
  id: string;
  symbol: string;
  displayName: string;
  timestamp: number;
  price: number | null;
  pipSize: number;
  dataReady: boolean;
  dataAgeMs: number | null;
  marketOpen: boolean;
  currentSpread: number | null;
  baselineSpread: number | null;
  /** Completed candles only, oldest → newest, keyed by timeframe seconds. */
  candles: Record<number, ForexCandle[]>;
};

export type StrategyScoreBreakdown = {
  trendAlignment: number;
  marketStructure: number;
  momentum: number;
  volatility: number;
  pullbackQuality: number;
  entryLocation: number;
  candleConfirmation: number;
  timeframeConsensus: number;
};

export type StrategySnapshot = {
  timestamp: number;
  symbol: string;
  displayName: string;
  marketState: { open: boolean; dataReady: boolean; dataAgeMs: number | null; session: string };
  trend: { context: Bias; contextStrength: TrendState; confirmation: Bias; entry: Bias };
  structure: StructureState;
  volatility: { regime: VolatilityRegime; atr: number | null; normalizedAtr: number | null };
  momentum: MomentumState;
  entryContext: {
    direction: StrategyDirection | null;
    pullback: boolean;
    nearLevel: boolean;
    overextended: boolean;
    candleConfirmed: boolean;
    triggerPrice: number | null;
    structureId: string;
  };
  spread: { current: number | null; baseline: number | null; acceptable: boolean };
  score: number;
  breakdown: StrategyScoreBreakdown;
  decision: StrategyDecisionState;
  direction: StrategyDirection | null;
  reasons: string[];
};

export type StrategySignal = {
  setupId: string;
  symbol: string;
  displayName: string;
  decision: StrategyDirection;
  status: "READY" | "LOCKED" | "INVALIDATED" | "EXPIRED";
  score: number;
  triggerPrice: number | null;
  suggestedDurationSeconds: number;
  createdAt: number;
  expiresAt: number;
  valid: boolean;
  reasons: string[];
};

export type StrategyEventType =
  | "STRATEGY_ANALYZING"
  | "SETUP_FORMING"
  | "SIGNAL_READY"
  | "SIGNAL_INVALIDATED"
  | "NO_TRADE";

export type StrategyEvent = {
  type: StrategyEventType;
  symbol: string;
  timestamp: number;
  signal?: StrategySignal;
  snapshot?: StrategySnapshot;
};

export type StrategyEngineStatus = "STOPPED" | "WARMING_UP" | "SCANNING" | "SIGNAL_READY" | "ERROR";

export type StrategyHealth = {
  status: StrategyEngineStatus;
  strategyReady: boolean;
  dataReady: boolean;
  lastEvaluation: number | null;
  lastSignal: StrategySignal | null;
  activeSetup: StrategySignal | null;
  message: string;
};
