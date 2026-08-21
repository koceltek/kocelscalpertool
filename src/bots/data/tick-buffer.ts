import type { ForexTickPoint } from "./types";

/**
 * Fixed-size rolling tick buffer with duplicate and out-of-order protection.
 * Memory is hard-capped: the oldest point is dropped when the cap is reached.
 */
export class TickBuffer {
  private points: ForexTickPoint[] = [];
  private seen = new Set<string>();

  constructor(private readonly maxSize: number) {}

  get size() {
    return this.points.length;
  }

  get latest(): ForexTickPoint | null {
    return this.points.length > 0 ? this.points[this.points.length - 1]! : null;
  }

  get previous(): ForexTickPoint | null {
    return this.points.length > 1 ? this.points[this.points.length - 2]! : null;
  }

  private key(point: ForexTickPoint) {
    return `${point.epoch}:${point.price}`;
  }

  isDuplicate(point: ForexTickPoint) {
    return this.seen.has(this.key(point));
  }

  /** True when the point is older than the newest stored point. */
  isOutOfOrder(point: ForexTickPoint) {
    const latest = this.latest;
    return latest !== null && point.epoch < latest.epoch;
  }

  /** Appends a point. Returns false when rejected as duplicate. */
  append(point: ForexTickPoint): boolean {
    if (this.isDuplicate(point)) return false;
    this.points.push(point);
    this.seen.add(this.key(point));
    this.trim();
    return true;
  }

  /** Inserts an out-of-order point without disturbing the latest state. */
  insertOrdered(point: ForexTickPoint): boolean {
    if (this.isDuplicate(point)) return false;
    let index = this.points.length;
    while (index > 0 && this.points[index - 1]!.epoch > point.epoch) index -= 1;
    this.points.splice(index, 0, point);
    this.seen.add(this.key(point));
    this.trim();
    return true;
  }

  /** Replaces the buffer with a normalized, sorted, deduplicated history. */
  reset(points: ForexTickPoint[]) {
    const sorted = [...points].sort((a, b) => a.epoch - b.epoch);
    this.points = [];
    this.seen.clear();
    for (const point of sorted) this.append(point);
  }

  private trim() {
    if (this.points.length <= this.maxSize) return;
    const removed = this.points.splice(0, this.points.length - this.maxSize);
    for (const point of removed) this.seen.delete(this.key(point));
  }

  /** Immutable copy so consumers can never corrupt the market data. */
  toArray(limit?: number): ForexTickPoint[] {
    const source = limit ? this.points.slice(-limit) : this.points;
    return source.map((p) => ({ ...p }));
  }

  clear() {
    this.points = [];
    this.seen.clear();
  }
}
