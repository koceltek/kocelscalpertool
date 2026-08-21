import { SUPPORTED_FOREX_PAIRS, type ForexPairId } from "./config";
import type { ForexTickPoint } from "./types";

/**
 * Development-only tick injector.
 *
 * Used by tests and manual verification to push simulated ticks through the
 * real pipeline. It is never enabled for users: production always uses live
 * Deriv data, and mock ticks are never mixed into a live stream.
 */
export class MockForexDataProvider {
  private timer: ReturnType<typeof setInterval> | null = null;
  private prices = new Map<ForexPairId, number>([
    ["EURUSD", 1.0845],
    ["USDJPY", 148.25],
    ["GBPUSD", 1.2712],
  ]);

  constructor(private readonly emit: (id: ForexPairId, point: ForexTickPoint) => void) {}

  start(intervalMs = 1000) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      for (const pair of SUPPORTED_FOREX_PAIRS) {
        const base = this.prices.get(pair.id)!;
        const step = (Math.random() - 0.5) * (pair.id === "USDJPY" ? 0.02 : 0.0002);
        const price = Number((base + step).toFixed(pair.id === "USDJPY" ? 3 : 5));
        this.prices.set(pair.id, price);
        this.emit(pair.id, { price, epoch: Math.floor(Date.now() / 1000) });
      }
    }, intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
