import { INDICES_MAX_CANDLES, INDICES_TIMEFRAMES, type IndicesTimeframe } from "./config";
import type { IndicesCandle, IndicesTick } from "./types";

export class IndicesCandleEngine {
  private forming = new Map<IndicesTimeframe, IndicesCandle>();
  private closed = new Map<IndicesTimeframe, IndicesCandle[]>();
  constructor(private readonly symbol: string) { for (const timeframe of INDICES_TIMEFRAMES) this.closed.set(timeframe, []); }

  add(tick: IndicesTick): { opened: IndicesCandle[]; updated: IndicesCandle[]; closed: IndicesCandle[] } {
    const events = { opened: [], updated: [], closed: [] } as { opened: IndicesCandle[]; updated: IndicesCandle[]; closed: IndicesCandle[] };
    for (const timeframe of INDICES_TIMEFRAMES) {
      const startTime = Math.floor(tick.epoch / timeframe) * timeframe;
      const current = this.forming.get(timeframe);
      if (!current) { const candle = this.open(timeframe, startTime, tick.price); this.forming.set(timeframe, candle); events.opened.push({ ...candle }); continue; }
      if (startTime < current.startTime) continue;
      if (startTime > current.startTime) {
        const complete = { ...current, isClosed: true };
        const history = this.closed.get(timeframe)!;
        history.push(complete);
        if (history.length > INDICES_MAX_CANDLES) history.splice(0, history.length - INDICES_MAX_CANDLES);
        events.closed.push(complete);
        const next = this.open(timeframe, startTime, tick.price);
        this.forming.set(timeframe, next);
        events.opened.push({ ...next });
        continue;
      }
      current.high = Math.max(current.high, tick.price); current.low = Math.min(current.low, tick.price);
      current.close = tick.price; current.endTime = tick.epoch; current.tickCount += 1;
      events.updated.push({ ...current });
    }
    return events;
  }
  seed(ticks: IndicesTick[]) { this.forming.clear(); for (const timeframe of INDICES_TIMEFRAMES) this.closed.set(timeframe, []); for (const tick of ticks) this.add(tick); }
  get(timeframe: IndicesTimeframe) { return [...(this.closed.get(timeframe) ?? []), ...(this.forming.has(timeframe) ? [this.forming.get(timeframe)!] : [])].map((candle) => ({ ...candle })); }
  clear() { this.forming.clear(); for (const timeframe of INDICES_TIMEFRAMES) this.closed.set(timeframe, []); }
  private open(timeframe: IndicesTimeframe, startTime: number, price: number): IndicesCandle { return { symbol: this.symbol, timeframe, open: price, high: price, low: price, close: price, startTime, endTime: startTime, tickCount: 1, isClosed: false }; }
}
