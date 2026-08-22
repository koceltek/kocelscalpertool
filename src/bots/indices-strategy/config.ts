import type { IndicesTimeframe } from "@/bots/indices-data";

export type StrategyDirection = "RISE" | "FALL";
export type StrategyMode = "LIVE" | "BACKTEST" | "PAPER_TRADING";

export type SymbolStrategyConfig = {
  trendThreshold: number;
  minimumConfidence: number;
  signalLifetimeMs: number;
  cooldownMs: number;
  maxEntryDriftAtr: number;
  minimumTicks: number;
};

export type IndicesStrategyConfig = {
  version: string;
  timeframes: { regime: 900; trend: 300; setup: 60 };
  emaPeriods: { fast: number; medium: number; slow: number };
  rsiPeriod: number;
  atrPeriod: number;
  tickWindows: { micro: number; momentum: number };
  minimumSignalConfidence: number;
  maxVolatilityRatio: number;
  maxChopRatio: number;
  maxExtendedAtr: number;
  weights: { trend: number; momentum: number; structure: number; volatility: number; pullback: number; microstructure: number; entryTiming: number; multiTimeframe: number; marketQuality: number };
  symbolOverrides: Record<string, Partial<SymbolStrategyConfig>>;
};

export const INDICES_STRATEGY_CONFIG: IndicesStrategyConfig = {
  version: "4B.1", timeframes: { regime: 900, trend: 300, setup: 60 },
  emaPeriods: { fast: 20, medium: 50, slow: 200 }, rsiPeriod: 14, atrPeriod: 14,
  tickWindows: { micro: 20, momentum: 50 }, minimumSignalConfidence: 80,
  maxVolatilityRatio: 3, maxChopRatio: 0.7, maxExtendedAtr: 2.5,
  weights: { trend: 15, momentum: 15, structure: 15, volatility: 10, pullback: 15, microstructure: 10, entryTiming: 10, multiTimeframe: 5, marketQuality: 5 },
  symbolOverrides: {},
};

export function configForSymbol(symbol: string, config = INDICES_STRATEGY_CONFIG): SymbolStrategyConfig {
  return { trendThreshold: 60, minimumConfidence: config.minimumSignalConfidence, signalLifetimeMs: 8_000, cooldownMs: 20_000, maxEntryDriftAtr: 0.35, minimumTicks: 100, ...config.symbolOverrides[symbol] };
}
