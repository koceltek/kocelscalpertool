import type { ForexCandle } from "@/bots/data/types";

/** Deterministic indicator maths. Given the same candles, same output. */

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i += 1) {
    prev = (values[i] as number) * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function lastEma(values: number[], period: number): number | null {
  const series = ema(values, period);
  return series.length ? (series[series.length - 1] as number) : null;
}

export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = (values[i] as number) - (values[i - 1] as number);
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i += 1) {
    const diff = (values[i] as number) - (values[i - 1] as number);
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function rsiSeries(values: number[], period = 14, points = 5): number[] {
  const out: number[] = [];
  for (let i = points; i >= 1; i -= 1) {
    const slice = values.slice(0, values.length - i + 1);
    const value = rsi(slice, period);
    if (value !== null) out.push(value);
  }
  const latest = rsi(values, period);
  if (latest !== null) out.push(latest);
  return out;
}

export function atr(candles: ForexCandle[], period = 14): number | null {
  if (candles.length < period + 1) return null;
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const c = candles[i] as ForexCandle;
    const prev = candles[i - 1] as ForexCandle;
    trueRanges.push(
      Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)),
    );
  }
  const recent = trueRanges.slice(-period * 3);
  if (recent.length < period) return null;
  let value = recent.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < recent.length; i += 1) {
    value = (value * (period - 1) + (recent[i] as number)) / period;
  }
  return value;
}

export type Swing = { index: number; price: number; kind: "HIGH" | "LOW" };

/** Pivot detector using completed candles only — never looks past `candles`. */
export function swings(candles: ForexCandle[], lookaround = 2): Swing[] {
  const found: Swing[] = [];
  for (let i = lookaround; i < candles.length - lookaround; i += 1) {
    const c = candles[i] as ForexCandle;
    let isHigh = true;
    let isLow = true;
    for (let j = i - lookaround; j <= i + lookaround; j += 1) {
      if (j === i) continue;
      const other = candles[j] as ForexCandle;
      if (other.high >= c.high) isHigh = false;
      if (other.low <= c.low) isLow = false;
    }
    if (isHigh) found.push({ index: i, price: c.high, kind: "HIGH" });
    if (isLow) found.push({ index: i, price: c.low, kind: "LOW" });
  }
  return found;
}

export function closes(candles: ForexCandle[]): number[] {
  return candles.map((c) => c.close);
}

/** Slope of an EMA over `span` samples, normalized by price. */
export function normalizedSlope(series: number[], span = 5): number | null {
  if (series.length < span + 1) return null;
  const latest = series[series.length - 1] as number;
  const past = series[series.length - 1 - span] as number;
  if (!latest) return null;
  return (latest - past) / latest;
}

export type CandleQuality = {
  direction: "UP" | "DOWN" | "FLAT";
  bodyRatio: number;
  upperWickRatio: number;
  lowerWickRatio: number;
  strong: boolean;
  engulfing: boolean;
  rejectionWick: boolean;
};

export function candleQuality(candle: ForexCandle, previous?: ForexCandle): CandleQuality {
  const range = Math.max(candle.high - candle.low, Number.EPSILON);
  const body = candle.close - candle.open;
  const bodyRatio = Math.abs(body) / range;
  const upperWickRatio = (candle.high - Math.max(candle.open, candle.close)) / range;
  const lowerWickRatio = (Math.min(candle.open, candle.close) - candle.low) / range;
  const direction = body > 0 ? "UP" : body < 0 ? "DOWN" : "FLAT";
  const engulfing = previous
    ? Math.abs(body) > Math.abs(previous.close - previous.open) * 1.2 &&
      ((body > 0 && previous.close < previous.open) || (body < 0 && previous.close > previous.open))
    : false;
  return {
    direction,
    bodyRatio,
    upperWickRatio,
    lowerWickRatio,
    strong: bodyRatio >= 0.55,
    engulfing,
    rejectionWick: Math.max(upperWickRatio, lowerWickRatio) >= 0.5,
  };
}
