import type { ForexCandle } from "@/bots/data/types";
import { FOREX_STRATEGY_CONFIG as CFG } from "./config";
import {
  atr,
  candleQuality,
  closes,
  ema,
  lastEma,
  normalizedSlope,
  rsi,
  rsiSeries,
  swings,
} from "./indicators";
import type {
  Bias,
  MarketSnapshotInput,
  MomentumState,
  StructureState,
  StrategyDirection,
  StrategyScoreBreakdown,
  StrategySnapshot,
  TrendState,
  VolatilityRegime,
} from "./types";

/**
 * Pure, deterministic strategy evaluation. Consumes a market snapshot (live or
 * historical) and returns an immutable strategy snapshot. It never buys, never
 * mutates its input, and never uses Math.random().
 */

function biasFromTrend(trend: TrendState): Bias {
  if (trend === "STRONG_BULLISH" || trend === "WEAK_BULLISH") return "BULLISH";
  if (trend === "STRONG_BEARISH" || trend === "WEAK_BEARISH") return "BEARISH";
  return "NEUTRAL";
}

function trendState(candles: ForexCandle[]): { trend: TrendState; ema20: number | null; ema50: number | null } {
  const values = closes(candles);
  const e20series = ema(values, 20);
  const ema20 = e20series.length ? (e20series[e20series.length - 1] as number) : null;
  const ema50 = lastEma(values, 50);
  const ema200 = lastEma(values, 200);
  const price = values[values.length - 1];
  if (ema20 === null || ema50 === null || ema200 === null || price === undefined) {
    return { trend: "NEUTRAL", ema20, ema50 };
  }
  const separation = Math.abs(ema20 - ema50) / price;
  const slope = normalizedSlope(e20series, 5) ?? 0;
  const compressed = separation < 0.00015;

  const bullishOrder = ema20 > ema50 && ema50 > ema200 && price > ema50;
  const bearishOrder = ema20 < ema50 && ema50 < ema200 && price < ema50;

  if (compressed) return { trend: "NEUTRAL", ema20, ema50 };
  if (bullishOrder) {
    return { trend: slope > 0.00012 && separation > 0.0004 ? "STRONG_BULLISH" : "WEAK_BULLISH", ema20, ema50 };
  }
  if (bearishOrder) {
    return { trend: slope < -0.00012 && separation > 0.0004 ? "STRONG_BEARISH" : "WEAK_BEARISH", ema20, ema50 };
  }
  if (ema20 > ema50 && price > ema20 && slope > 0) return { trend: "WEAK_BULLISH", ema20, ema50 };
  if (ema20 < ema50 && price < ema20 && slope < 0) return { trend: "WEAK_BEARISH", ema20, ema50 };
  return { trend: "NEUTRAL", ema20, ema50 };
}

function volatilityRegime(atrValue: number | null, price: number, recentAtr: number | null): VolatilityRegime {
  if (atrValue === null || !price) return "DEAD";
  const normalized = atrValue / price;
  const expanding = recentAtr !== null && atrValue > recentAtr * 1.25;
  if (normalized < 0.00025) return "DEAD";
  if (normalized < 0.0005) return "LOW";
  if (normalized > 0.0035) return "EXTREME";
  if (normalized > 0.002) return "HIGH";
  return expanding ? "EXPANDING" : "NORMAL";
}

function momentumState(candles: ForexCandle[], atrValue: number | null): MomentumState {
  const values = closes(candles);
  if (values.length < 20 || !atrValue) return "NEUTRAL";
  const price = values[values.length - 1] as number;
  const past = values[values.length - 6] as number;
  const velocity = (price - past) / atrValue;
  const e9 = ema(values, 9);
  const slope = normalizedSlope(e9, 3) ?? 0;
  const rsiPoints = rsiSeries(values, CFG.indicators.rsi, 4);
  const rsiNow = rsiPoints[rsiPoints.length - 1] ?? 50;
  const rsiPrev = rsiPoints[0] ?? 50;
  const rsiDelta = rsiNow - rsiPrev;

  let score = 0;
  score += velocity > 0.6 ? 2 : velocity > 0.2 ? 1 : velocity < -0.6 ? -2 : velocity < -0.2 ? -1 : 0;
  score += slope > 0.0001 ? 1 : slope < -0.0001 ? -1 : 0;
  score += rsiDelta > 3 && rsiNow > 50 ? 1 : rsiDelta < -3 && rsiNow < 50 ? -1 : 0;

  const bodies = candles.slice(-3).map((c) => Math.sign(c.close - c.open));
  if (bodies.every((b) => b > 0)) score += 1;
  if (bodies.every((b) => b < 0)) score -= 1;

  if (score >= 3) return "STRONG_UP";
  if (score >= 1) return "WEAK_UP";
  if (score <= -3) return "STRONG_DOWN";
  if (score <= -1) return "WEAK_DOWN";
  return "NEUTRAL";
}

type StructureResult = {
  state: StructureState;
  swingHigh: number | null;
  swingLow: number | null;
  structureId: string;
  falseBreak: boolean;
};

function structure(candles: ForexCandle[], atrValue: number | null): StructureResult {
  const pivots = swings(candles.slice(-80), 2);
  const highs = pivots.filter((p) => p.kind === "HIGH").slice(-3);
  const lows = pivots.filter((p) => p.kind === "LOW").slice(-3);
  const swingHigh = highs.length ? (highs[highs.length - 1] as { price: number }).price : null;
  const swingLow = lows.length ? (lows[lows.length - 1] as { price: number }).price : null;
  const last = candles[candles.length - 1];
  const structureId = `${swingHigh?.toFixed(5) ?? "x"}-${swingLow?.toFixed(5) ?? "x"}`;

  if (!last || highs.length < 2 || lows.length < 2) {
    return { state: "UNKNOWN", swingHigh, swingLow, structureId, falseBreak: false };
  }

  const hh = (highs[highs.length - 1] as { price: number }).price > (highs[highs.length - 2] as { price: number }).price;
  const hl = (lows[lows.length - 1] as { price: number }).price > (lows[lows.length - 2] as { price: number }).price;
  const lh = (highs[highs.length - 1] as { price: number }).price < (highs[highs.length - 2] as { price: number }).price;
  const ll = (lows[lows.length - 1] as { price: number }).price < (lows[lows.length - 2] as { price: number }).price;

  const buffer = (atrValue ?? 0) * 0.15;
  const brokeUp = swingHigh !== null && last.close > swingHigh + buffer;
  const brokeDown = swingLow !== null && last.close < swingLow - buffer;

  // False-break protection: wick beyond the level but close back inside.
  const falseBreak =
    (swingHigh !== null && last.high > swingHigh && last.close <= swingHigh) ||
    (swingLow !== null && last.low < swingLow && last.close >= swingLow);

  if (brokeUp) return { state: "BREAKOUT_UP", swingHigh, swingLow, structureId, falseBreak };
  if (brokeDown) return { state: "BREAKOUT_DOWN", swingHigh, swingLow, structureId, falseBreak };
  if (hh && hl) return { state: "BULLISH", swingHigh, swingLow, structureId, falseBreak };
  if (lh && ll) return { state: "BEARISH", swingHigh, swingLow, structureId, falseBreak };
  if (swingHigh !== null && swingLow !== null) {
    const range = swingHigh - swingLow;
    if (atrValue && range < atrValue * 2.5) {
      return { state: "RANGING", swingHigh, swingLow, structureId, falseBreak };
    }
  }
  return { state: "TRANSITION", swingHigh, swingLow, structureId, falseBreak };
}

function sessionName(timestamp: number): string {
  const hour = new Date(timestamp).getUTCHours();
  if (hour >= 23 || hour < 7) return "ASIA";
  if (hour < 12) return "LONDON";
  if (hour < 17) return "LONDON_NEWYORK";
  return "NEWYORK";
}

function blankBreakdown(): StrategyScoreBreakdown {
  return {
    trendAlignment: 0,
    marketStructure: 0,
    momentum: 0,
    volatility: 0,
    pullbackQuality: 0,
    entryLocation: 0,
    candleConfirmation: 0,
    timeframeConsensus: 0,
  };
}

function baseSnapshot(input: MarketSnapshotInput, reasons: string[], decision: StrategySnapshot["decision"]): StrategySnapshot {
  return {
    timestamp: input.timestamp,
    symbol: input.symbol,
    displayName: input.displayName,
    marketState: {
      open: input.marketOpen,
      dataReady: input.dataReady,
      dataAgeMs: input.dataAgeMs,
      session: sessionName(input.timestamp),
    },
    trend: { context: "NEUTRAL", contextStrength: "NEUTRAL", confirmation: "NEUTRAL", entry: "NEUTRAL" },
    structure: "UNKNOWN",
    volatility: { regime: "DEAD", atr: null, normalizedAtr: null },
    momentum: "NEUTRAL",
    entryContext: {
      direction: null,
      pullback: false,
      nearLevel: false,
      overextended: false,
      candleConfirmed: false,
      triggerPrice: input.price,
      structureId: "none",
    },
    spread: { current: input.currentSpread, baseline: input.baselineSpread, acceptable: true },
    score: 0,
    breakdown: blankBreakdown(),
    decision,
    direction: null,
    reasons,
  };
}

export function evaluateForexSetup(input: MarketSnapshotInput): StrategySnapshot {
  const { context, confirmation, entry } = CFG.timeframes;

  // 1. Data validation ------------------------------------------------------
  if (!input.dataReady || input.price === null) {
    return baseSnapshot(input, ["Market data not ready"], "ANALYZING");
  }
  if (input.dataAgeMs !== null && input.dataAgeMs > CFG.maxDataAgeMs) {
    return baseSnapshot(input, ["Market data stale"], "NO_TRADE");
  }
  // 2. Market availability --------------------------------------------------
  if (!input.marketOpen) return baseSnapshot(input, ["Market closed or suspended"], "NO_TRADE");

  // 3. Candle readiness -----------------------------------------------------
  const c15 = (input.candles[context] ?? []).filter((c) => c.complete);
  const c5 = (input.candles[confirmation] ?? []).filter((c) => c.complete);
  const c1 = (input.candles[entry] ?? []).filter((c) => c.complete);
  if (
    c15.length < CFG.warmup.context ||
    c5.length < CFG.warmup.confirmation ||
    c1.length < CFG.warmup.entry
  ) {
    return baseSnapshot(input, ["Warming up: building indicators"], "ANALYZING");
  }

  const price = input.price;
  const snapshot = baseSnapshot(input, [], "NO_TRADE");
  const reasons: string[] = [];

  // 4-5. Higher-timeframe trend --------------------------------------------
  const ctx = trendState(c15);
  const conf = trendState(c5);
  const ent = trendState(c1);
  const contextBias = biasFromTrend(ctx.trend);
  const confirmationBias = biasFromTrend(conf.trend);
  const entryBias = biasFromTrend(ent.trend);
  snapshot.trend = {
    context: contextBias,
    contextStrength: ctx.trend,
    confirmation: confirmationBias,
    entry: entryBias,
  };

  // 6. Structure ------------------------------------------------------------
  const atr5 = atr(c5, CFG.indicators.atr);
  const atr1 = atr(c1, CFG.indicators.atr);
  const struct = structure(c5, atr5);
  snapshot.structure = struct.state;

  // 7. Volatility -----------------------------------------------------------
  const priorAtr = atr(c1.slice(0, -10), CFG.indicators.atr);
  const regime = volatilityRegime(atr1, price, priorAtr);
  snapshot.volatility = {
    regime,
    atr: atr1,
    normalizedAtr: atr1 !== null ? atr1 / price : null,
  };

  // 8. Momentum -------------------------------------------------------------
  const momentum = momentumState(c1, atr1);
  snapshot.momentum = momentum;

  // 9-10. Pullback / entry location / candle confirmation -------------------
  const desired: StrategyDirection | null =
    contextBias === "BULLISH" ? "RISE" : contextBias === "BEARISH" ? "FALL" : null;

  const c1Values = closes(c1);
  const ema20_1 = lastEma(c1Values, 20);
  const ema50_1 = lastEma(c1Values, 50);
  const lastCandle = c1[c1.length - 1] as ForexCandle;
  const prevCandle = c1[c1.length - 2];
  const quality = candleQuality(lastCandle, prevCandle);
  const rsi1 = rsi(c1Values, CFG.indicators.rsi) ?? 50;

  const emaDistance = ema20_1 !== null && atr1 ? Math.abs(price - ema20_1) / atr1 : null;
  const nearLevel =
    (emaDistance !== null && emaDistance <= 0.8) ||
    (ema50_1 !== null && atr1 ? Math.abs(price - ema50_1) / atr1 <= 0.8 : false) ||
    (desired === "RISE" && struct.swingLow !== null && atr1
      ? Math.abs(price - struct.swingLow) / atr1 <= 1.2
      : desired === "FALL" && struct.swingHigh !== null && atr1
        ? Math.abs(price - struct.swingHigh) / atr1 <= 1.2
        : false);

  const recentSwingWindow = c1.slice(-12);
  const swingHi = Math.max(...recentSwingWindow.map((c) => c.high));
  const swingLo = Math.min(...recentSwingWindow.map((c) => c.low));
  const displacement = atr1 ? (swingHi - swingLo) / atr1 : 0;
  const overextended = displacement > CFG.overextensionAtrMultiple;

  const pullback =
    desired === "RISE"
      ? c1.slice(-5, -1).some((c) => c.close < c.open) && (ema20_1 === null || price >= ema20_1 * 0.999)
      : desired === "FALL"
        ? c1.slice(-5, -1).some((c) => c.close > c.open) && (ema20_1 === null || price <= ema20_1 * 1.001)
        : false;

  const candleConfirmed =
    desired === "RISE"
      ? quality.direction === "UP" && quality.strong && rsi1 > 45
      : desired === "FALL"
        ? quality.direction === "DOWN" && quality.strong && rsi1 < 55
        : false;

  snapshot.entryContext = {
    direction: desired,
    pullback,
    nearLevel,
    overextended,
    candleConfirmed,
    triggerPrice: price,
    structureId: struct.structureId,
  };

  // 12. Spread validation ---------------------------------------------------
  const spreadAcceptable =
    input.currentSpread === null ||
    input.baselineSpread === null ||
    input.baselineSpread === 0 ||
    input.currentSpread <= input.baselineSpread * CFG.maxSpreadMultiplier;
  snapshot.spread = {
    current: input.currentSpread,
    baseline: input.baselineSpread,
    acceptable: spreadAcceptable,
  };

  // 13. Score ---------------------------------------------------------------
  const w = CFG.weights;
  const breakdown = blankBreakdown();

  if (desired) {
    const bull = desired === "RISE";
    const strongContext = ctx.trend === (bull ? "STRONG_BULLISH" : "STRONG_BEARISH");
    breakdown.trendAlignment = strongContext ? w.trendAlignment : w.trendAlignment * 0.7;

    const structOk = bull
      ? struct.state === "BULLISH" || struct.state === "BREAKOUT_UP"
      : struct.state === "BEARISH" || struct.state === "BREAKOUT_DOWN";
    breakdown.marketStructure = structOk
      ? struct.falseBreak
        ? w.marketStructure * 0.3
        : w.marketStructure
      : struct.state === "TRANSITION"
        ? w.marketStructure * 0.4
        : 0;

    const momentumOk = bull
      ? momentum === "STRONG_UP" || momentum === "WEAK_UP"
      : momentum === "STRONG_DOWN" || momentum === "WEAK_DOWN";
    breakdown.momentum = momentumOk
      ? momentum.startsWith("STRONG")
        ? w.momentum
        : w.momentum * 0.65
      : 0;

    breakdown.volatility =
      regime === "NORMAL" ? w.volatility : regime === "EXPANDING" ? w.volatility * 0.9 : 0;

    breakdown.pullbackQuality = pullback ? w.pullbackQuality : 0;
    breakdown.entryLocation = nearLevel ? (overextended ? 0 : w.entryLocation) : 0;
    breakdown.candleConfirmation = candleConfirmed
      ? quality.engulfing
        ? w.candleConfirmation
        : w.candleConfirmation * 0.8
      : 0;

    const consensusCount =
      (confirmationBias === contextBias ? 1 : 0) + (entryBias === contextBias ? 1 : 0);
    const fighting =
      (confirmationBias !== "NEUTRAL" && confirmationBias !== contextBias) ||
      (entryBias !== "NEUTRAL" && entryBias !== contextBias);
    breakdown.timeframeConsensus = fighting
      ? 0
      : consensusCount === 2
        ? w.timeframeConsensus
        : consensusCount === 1
          ? w.timeframeConsensus * 0.6
          : 0;
  }

  const score = Math.round(
    Object.values(breakdown).reduce((total, value) => total + value, 0),
  );
  snapshot.breakdown = breakdown;
  snapshot.score = score;

  // 14. Mandatory filters ---------------------------------------------------
  if (!desired) reasons.push("15M context neutral");
  if (desired) {
    const fighting =
      (confirmationBias !== "NEUTRAL" && confirmationBias !== contextBias) ||
      (entryBias !== "NEUTRAL" && entryBias !== contextBias);
    if (fighting) reasons.push("Timeframes disagree");
    if (struct.state === "RANGING") reasons.push("Market ranging");
    if (!CFG.allowedVolatility.includes(regime as "NORMAL" | "EXPANDING")) {
      reasons.push(`Volatility ${regime}`);
    }
    if (!spreadAcceptable) reasons.push("Spread abnormal");
    if (overextended) reasons.push("Price overextended");
    if (struct.falseBreak) reasons.push("Possible false breakout");
    if (!candleConfirmed) reasons.push("No entry confirmation");
    if (!pullback) reasons.push("No pullback structure");
  }

  const mandatoryPass = desired !== null && reasons.length === 0;

  // 15. Signal generation ---------------------------------------------------
  if (!mandatoryPass) {
    snapshot.decision = score >= CFG.minimumScore * 0.6 && desired ? "SETUP_FORMING" : "NO_TRADE";
    snapshot.reasons = reasons.length ? reasons : ["Conditions not met"];
    return snapshot;
  }
  if (score < CFG.minimumScore) {
    snapshot.decision = "SETUP_FORMING";
    snapshot.reasons = [`Score ${score} below threshold ${CFG.minimumScore}`];
    return snapshot;
  }

  snapshot.decision = "SIGNAL_READY";
  snapshot.direction = desired;
  snapshot.reasons = [
    `15M ${contextBias}`,
    `5M ${confirmationBias}`,
    `1M ${entryBias}`,
    `structure ${struct.state}`,
    `momentum ${momentum}`,
    `volatility ${regime}`,
    "pullback + candle confirmation",
  ];
  return snapshot;
}
