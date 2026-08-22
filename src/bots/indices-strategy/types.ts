import type { IndicesCandle, IndicesMarketSnapshot } from "@/bots/indices-data";
import type { StrategyDirection } from "./config";

export type SignalStatus = "ANALYZING" | "WAITING" | "NO_TRADE" | "SETUP_DETECTED" | "ENTRY_READY" | "SIGNAL_EXPIRED" | "COOLDOWN" | "SIGNAL_INVALIDATED";
export type MarketRegime = "STRONG_UPTREND" | "WEAK_UPTREND" | "RANGING" | "WEAK_DOWNTREND" | "STRONG_DOWNTREND" | "HIGH_VOLATILITY" | "LOW_VOLATILITY" | "TRANSITION";
export type VolatilityRegime = "VERY_LOW" | "LOW" | "NORMAL" | "HIGH" | "EXTREME";
export type TrendDirection = StrategyDirection | "NEUTRAL";

export type StrategyDecision = {
  decision: StrategyDirection | "NO_TRADE" | "WAIT";
  confidence: number;
  symbol: string;
  entryReady: boolean;
  reasonCode: string;
  timestamp: number;
  validityWindow: number;
  strategyVersion: string;
  status: SignalStatus;
};

export type StrategySignal = {
  signalId: string;
  setupId: string;
  symbol: string;
  direction: StrategyDirection;
  confidence: number;
  strategyVersion: string;
  entryReferencePrice: number;
  generatedAt: number;
  expiresAt: number;
  timeframeContext: { regime: TrendDirection; trend: TrendDirection; setup: TrendDirection; tick: TrendDirection };
  marketRegime: MarketRegime;
  trendDirection: TrendDirection;
  setupType: "TREND_PULLBACK_CONTINUATION";
  validity: { maxTicks: number; maxEntryDriftAtr: number };
  status: "ENTRY_READY" | "EXPIRED" | "INVALIDATED" | "CONSUMED";
};

export type StrategyEvent =
  | { type: "SIGNAL_CREATED" | "SIGNAL_CONFIRMED" | "SIGNAL_READY" | "SIGNAL_EXPIRED" | "SIGNAL_INVALIDATED" | "SIGNAL_CONSUMED"; payload: StrategySignal };

export type StrategyInput = { snapshot: IndicesMarketSnapshot; candles: IndicesCandle[] };
