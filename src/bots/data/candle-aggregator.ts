import { CANDLE_HISTORY_SIZE, CANDLE_TIMEFRAMES, type CandleTimeframe } from "./config";
import type { ForexCandle, ForexTickPoint } from "./types";

/**
 * Builds OHLC candles from the tick stream for the timeframes later strategy
 * phases will need (1m / 5m / 15m).
 *
 * No indicators, no strategy — pure aggregation. Candles are built strictly
 * from ticks already received, so no future information can leak backwards.
 */
export class ForexCandleAggregator {
  private forming = new Map<CandleTimeframe, ForexCandle>();
  private completed = new Map<CandleTimeframe, ForexCandle[]>();

  constructor(private readonly symbol: string) {
    for (const tf of CANDLE_TIMEFRAMES) this.completed.set(tf, []);
  }

  /** Feeds one tick; returns any candles completed by this tick. */
  add(point: ForexTickPoint): ForexCandle[] {
    const closed: ForexCandle[] = [];
    for (const tf of CANDLE_TIMEFRAMES) {
      const startTime = Math.floor(point.epoch / tf) * tf;
      const current = this.forming.get(tf);

      if (!current) {
        this.forming.set(tf, this.open(tf, startTime, point.price));
        continue;
      }

      if (startTime > current.startTime) {
        const done: ForexCandle = { ...current, complete: true };
        const list = this.completed.get(tf)!;
        list.push(done);
        if (list.length > CANDLE_HISTORY_SIZE) list.splice(0, list.length - CANDLE_HISTORY_SIZE);
        closed.push(done);
        this.forming.set(tf, this.open(tf, startTime, point.price));
        continue;
      }

      if (startTime < current.startTime) continue; // out-of-order: ignore

      current.high = Math.max(current.high, point.price);
      current.low = Math.min(current.low, point.price);
      current.close = point.price;
      current.endTime = point.epoch;
      current.tickCount += 1;
    }
    return closed;
  }

  private open(timeframe: CandleTimeframe, startTime: number, price: number): ForexCandle {
    return {
      symbol: this.symbol,
      timeframe,
      open: price,
      high: price,
      low: price,
      close: price,
      startTime,
      endTime: startTime,
      tickCount: 1,
      complete: false,
    };
  }

  /** Rebuilds all candles from a historical buffer. */
  seed(points: ForexTickPoint[]) {
    this.forming.clear();
    for (const tf of CANDLE_TIMEFRAMES) this.completed.set(tf, []);
    for (const point of points) this.add(point);
  }

  completedCandles(timeframe: CandleTimeframe): ForexCandle[] {
    return (this.completed.get(timeframe) ?? []).map((c) => ({ ...c }));
  }

  formingCandle(timeframe: CandleTimeframe): ForexCandle | null {
    const candle = this.forming.get(timeframe);
    return candle ? { ...candle } : null;
  }

  clear() {
    this.forming.clear();
    for (const tf of CANDLE_TIMEFRAMES) this.completed.set(tf, []);
  }
}
