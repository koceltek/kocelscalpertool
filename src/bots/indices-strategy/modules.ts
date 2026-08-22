import type { IndicesCandle, IndicesMarketSnapshot, IndicesTick } from "@/bots/indices-data";
import { configForSymbol, INDICES_STRATEGY_CONFIG, type IndicesStrategyConfig, type StrategyDirection } from "./config";
import type { MarketRegime, TrendDirection, VolatilityRegime } from "./types";

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const ema = (values: number[], period: number) => {
  if (!values.length) return null;
  const alpha = 2 / (period + 1); let result = values[0]!;
  for (const value of values.slice(1)) result = value * alpha + result * (1 - alpha);
  return result;
};
const direction = (values: number[], threshold = 0) => { const delta = (values.at(-1) ?? 0) - (values[0] ?? 0); return delta > threshold ? "RISE" : delta < -threshold ? "FALL" : "NEUTRAL"; };

export class TrendEngine {
  analyze(candles: readonly IndicesCandle[]) {
    const closes = candles.filter((c) => c.isClosed).map((c) => c.close); const price = closes.at(-1) ?? null;
    const fast = ema(closes, 20), medium = ema(closes, 50), slow = ema(closes, 200);
    if (price === null || fast === null || medium === null) return { direction: "NEUTRAL" as TrendDirection, strength: 0, fast, medium, slow, slope: 0 };
    const slope = closes.length > 5 ? (fast - (ema(closes.slice(0, -5), 20) ?? fast)) / Math.max(Math.abs(price), 1) : 0;
    const bullish = fast > medium && slope > 0 && price > fast; const bearish = fast < medium && slope < 0 && price < fast;
    const alignment = slow === null ? 25 : bullish ? (fast > medium && medium > slow ? 35 : 20) : bearish ? (fast < medium && medium < slow ? 35 : 20) : 0;
    const persistence = Math.abs(avg(closes.slice(-10).map((v, i, a) => i ? v - a[i - 1]! : 0))) / Math.max(Math.abs(price), 1) * 10000;
    return { direction: bullish ? "RISE" : bearish ? "FALL" : "NEUTRAL", strength: clamp(alignment + clamp(Math.abs(slope) * 10000, 0, 35) + clamp(persistence, 0, 30)), fast, medium, slow, slope };
  }
}

export class MarketRegimeDetector {
  detect(trend: ReturnType<TrendEngine["analyze"]>, volatility: ReturnType<VolatilityEngine["analyze"]>): MarketRegime {
    if (volatility.regime === "EXTREME" || volatility.regime === "HIGH") return "HIGH_VOLATILITY";
    if (volatility.regime === "VERY_LOW") return "LOW_VOLATILITY";
    if (trend.strength < 35) return "RANGING";
    if (trend.strength > 75) return trend.direction === "RISE" ? "STRONG_UPTREND" : "STRONG_DOWNTREND";
    if (trend.direction === "RISE") return "WEAK_UPTREND";
    if (trend.direction === "FALL") return "WEAK_DOWNTREND";
    return "TRANSITION";
  }
}

export class VolatilityEngine {
  analyze(candles: readonly IndicesCandle[], snapshot: IndicesMarketSnapshot) {
    const ranges = candles.filter((c) => c.isClosed).map((c) => c.high - c.low); const current = avg(ranges.slice(-14)); const baseline = avg(ranges.slice(-50, -14)) || current;
    const normalized = snapshot.price ? current / snapshot.price : 0; const ratio = baseline ? current / baseline : 1;
    const regime: VolatilityRegime = ratio > 3 ? "EXTREME" : ratio > 1.8 ? "HIGH" : ratio < 0.35 ? "VERY_LOW" : ratio < 0.65 ? "LOW" : "NORMAL";
    return { atr: current, normalized, ratio, expanding: ratio > 1.1, regime, score: regime === "NORMAL" ? 90 : regime === "LOW" ? 65 : regime === "HIGH" ? 35 : 10 };
  }
}

export class MomentumEngine {
  analyze(candles: readonly IndicesCandle[], ticks: readonly IndicesTick[]) {
    const closes = candles.filter((c) => c.isClosed).map((c) => c.close); const changes = ticks.slice(-50).slice(1).map((t, i) => t.price - ticks.slice(-50)[i]!.price); const tickDirection = direction(changes, 0);
    const gains = closes.slice(1).map((v, i) => Math.max(0, v - closes[i]!)); const losses = closes.slice(1).map((v, i) => Math.max(0, closes[i]! - v)); const rs = avg(losses) ? avg(gains) / avg(losses) : 100; const rsi = 100 - 100 / (1 + rs);
    return { direction: tickDirection, tickMomentum: avg(changes), velocity: snapshotVelocity(ticks), rsi, score: clamp(50 + (tickDirection === "NEUTRAL" ? 0 : tickDirection === "RISE" ? 25 : -25) + (rsi > 50 ? 15 : -15)) };
  }
}
function snapshotVelocity(ticks: IndicesTick[]) { if (ticks.length < 2) return 0; const first = ticks[0]!, last = ticks.at(-1)!; return (last.price - first.price) / Math.max(last.epoch - first.epoch, 1); }

export class StructureEngine {
  analyze(candles: readonly IndicesCandle[]) {
    const recent = candles.filter((c) => c.isClosed).slice(-8); if (recent.length < 4) return { direction: "NEUTRAL" as TrendDirection, support: null, resistance: null, score: 0, rejection: false };
    const highs = recent.map((c) => c.high), lows = recent.map((c) => c.low); const bullish = highs.at(-1)! > highs[0]! && lows.at(-1)! > lows[0]!; const bearish = highs.at(-1)! < highs[0]! && lows.at(-1)! < lows[0]!;
    const last = recent.at(-1)!; const body = Math.abs(last.close - last.open); const rejection = last.high - last.low > 0 && (last.close > last.open ? last.open - last.low : last.high - last.open) > body;
    return { direction: bullish ? "RISE" : bearish ? "FALL" : "NEUTRAL", support: Math.min(...lows), resistance: Math.max(...highs), score: bullish || bearish ? 75 : 30, rejection };
  }
}

export class PullbackEngine {
  analyze(candles: readonly IndicesCandle[], trend: ReturnType<TrendEngine["analyze"]>, structure: ReturnType<StructureEngine["analyze"]>) {
    const recent = candles.filter((c) => c.isClosed).slice(-4); const last = recent.at(-1); if (!last || trend.direction === "NEUTRAL") return { valid: false, direction: "NEUTRAL" as TrendDirection, quality: 0 };
    const retracing = trend.direction === "RISE" ? last.close < (recent.at(-2)?.close ?? last.close) : last.close > (recent.at(-2)?.close ?? last.close);
    const rejection = structure.rejection && (trend.direction === structure.direction || structure.direction === "NEUTRAL");
    return { valid: retracing || rejection, direction: trend.direction, quality: clamp((retracing ? 35 : 10) + (rejection ? 35 : 0) + (trend.strength > 60 ? 20 : 0)) };
  }
}

export class MicroStructureEngine {
  analyze(ticks: readonly IndicesTick[]) {
    const recent = ticks.slice(-20); const changes = recent.slice(1).map((tick, i) => tick.price - recent[i]!.price); const up = changes.filter((v) => v > 0).length; const down = changes.filter((v) => v < 0).length; const total = up + down; const dir = up > down ? "RISE" : down > up ? "FALL" : "NEUTRAL";
    return { direction: dir as TrendDirection, imbalance: total ? Math.max(up, down) / total : 0, score: clamp(total ? Math.max(up, down) / total * 100 : 0), microHigh: recent.length ? Math.max(...recent.map((t) => t.price)) : null, microLow: recent.length ? Math.min(...recent.map((t) => t.price)) : null };
  }
}

export class EntryTimingEngine { analyze(momentum: ReturnType<MomentumEngine["analyze"]>, micro: ReturnType<MicroStructureEngine["analyze"]>, direction: TrendDirection) { return { confirmed: direction !== "NEUTRAL" && momentum.direction === direction && micro.direction === direction && micro.score >= 60, score: direction === momentum.direction && direction === micro.direction ? 90 : 25 }; } }
export class MultiTimeframeEngine { analyze(regime: TrendDirection, trend: TrendDirection, setup: TrendDirection, tick: TrendDirection) { const values = [regime, trend, setup, tick]; const rises = values.filter((v) => v === "RISE").length, falls = values.filter((v) => v === "FALL").length; return { direction: rises >= 3 ? "RISE" : falls >= 3 ? "FALL" : "NEUTRAL" as TrendDirection, agreement: Math.max(rises, falls) / values.length, conflict: rises > 0 && falls > 0 && Math.max(rises, falls) < 3 }; } }

export class SignalScoringEngine { score(values: Record<string, number>, config: IndicesStrategyConfig = INDICES_STRATEGY_CONFIG) { return Math.round(clamp(Object.entries(config.weights).reduce((total, [key, weight]) => total + (values[key] ?? 0) * weight / 100, 0))); } }
export class StrategySafetyGate {
  constructor(private readonly config: IndicesStrategyConfig = INDICES_STRATEGY_CONFIG) {}
  approve(input: { snapshot: IndicesMarketSnapshot; direction: StrategyDirection; confidence: number; setup: ReturnType<PullbackEngine["analyze"]>; timing: ReturnType<EntryTimingEngine["analyze"]>; trend: ReturnType<TrendEngine["analyze"]>; volatility: ReturnType<VolatilityEngine["analyze"]>; multi: ReturnType<MultiTimeframeEngine["analyze"]> }) {
    const symbolConfig = configForSymbol(input.snapshot.symbol, this.config);
    return Boolean(input.snapshot.marketState.ready && input.snapshot.marketState.marketState === "AVAILABLE" && input.snapshot.dataHealth.quality !== "BAD" && input.snapshot.dataHealth.dataAge !== null && input.snapshot.dataHealth.dataAge < 10_000 && input.trend.direction === input.direction && input.trend.strength >= symbolConfig.trendThreshold && input.volatility.regime !== "EXTREME" && input.setup.valid && input.timing.confirmed && !input.multi.conflict && input.confidence >= symbolConfig.minimumConfidence);
  }
}
