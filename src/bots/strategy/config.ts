/**
 * Phase 3B — central Forex scalping strategy configuration.
 *
 * Every tunable strategy value lives here. Nothing in this file is user-facing:
 * Phase 2 user settings (stake, loss limits, capital protection) are risk
 * configuration and must never alter these numbers.
 */

export const FOREX_STRATEGY_CONFIG = {
  timeframes: { context: 900, confirmation: 300, entry: 60 },
  indicators: { ema: [9, 20, 50, 200] as const, rsi: 14, atr: 14 },

  /** Minimum candles per timeframe before any evaluation is attempted. */
  warmup: { context: 60, confirmation: 80, entry: 120 },

  /** Weighted score components — total 100. */
  weights: {
    trendAlignment: 20,
    marketStructure: 15,
    momentum: 15,
    volatility: 10,
    pullbackQuality: 10,
    entryLocation: 10,
    candleConfirmation: 10,
    timeframeConsensus: 10,
  },

  minimumScore: 80,
  maxSignalAgeSeconds: 45,
  maxDataAgeMs: 5_000,
  /** Current spread must stay below baseline × this multiplier. */
  maxSpreadMultiplier: 1.8,
  cooldownSeconds: 60,
  /** Reject entries after a displacement larger than ATR × this value. */
  overextensionAtrMultiple: 2.2,
  /** Invalidate a ready signal once price drifts ATR × this from the trigger. */
  invalidationAtrDrift: 1.0,
  /** Volatility regimes accepted for new setups. */
  allowedVolatility: ["NORMAL", "EXPANDING"] as const,
  /** How often the engine re-evaluates entry timing (ms). */
  evaluationIntervalMs: 2_000,
  /** Suggested contract duration context handed to Phase 3C (seconds). */
  suggestedDurationSeconds: 180,
  /** Profit objective handed to the Forex exit engine. */
  targetProfit: 0.15,
} as const;

export type ForexStrategyConfig = typeof FOREX_STRATEGY_CONFIG;
