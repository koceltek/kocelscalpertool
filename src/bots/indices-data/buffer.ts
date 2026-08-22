import type { IndicesTick } from "./types";

export class IndicesTickBuffer {
  private ticks: IndicesTick[] = [];
  private keys = new Set<string>();

  constructor(private readonly maxSize: number) {}
  get size() { return this.ticks.length; }
  get latest() { return this.ticks.at(-1) ?? null; }

  private key(tick: IndicesTick) { return `${tick.symbol}:${tick.epoch}:${tick.tickId ?? ""}:${tick.price}`; }
  append(tick: IndicesTick): boolean {
    const key = this.key(tick);
    if (this.keys.has(key)) return false;
    const index = this.ticks.findIndex((item) => item.epoch > tick.epoch);
    if (index === -1) this.ticks.push(tick);
    else this.ticks.splice(index, 0, tick);
    this.keys.add(key);
    while (this.ticks.length > this.maxSize) {
      const removed = this.ticks.shift();
      if (removed) this.keys.delete(this.key(removed));
    }
    return true;
  }
  reset(ticks: IndicesTick[]) { this.ticks = []; this.keys.clear(); for (const tick of [...ticks].sort((a, b) => a.epoch - b.epoch)) this.append(tick); }
  toArray(limit?: number) { return (limit ? this.ticks.slice(-limit) : this.ticks).map((tick) => ({ ...tick })); }
  clear() { this.ticks = []; this.keys.clear(); }
}
