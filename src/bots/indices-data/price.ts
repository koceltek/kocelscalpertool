export function normalizePrice(value: unknown): number | null {
  const price = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(price) && price > 0 ? price : null;
}

export function getDecimalPrecision(price: number, pipSize?: number | null): number {
  if (pipSize && Number.isFinite(pipSize) && pipSize > 0) return Math.max(0, Math.ceil(-Math.log10(pipSize)));
  const text = price.toString().split(".")[1] ?? "";
  return text.length;
}

export function getPipSize(pipSize: unknown, price?: number): number | null {
  const parsed = normalizePrice(pipSize);
  return parsed ?? (price === undefined ? null : 10 ** -getDecimalPrecision(price));
}

export function priceToTicks(price: number, pipSize: number): number {
  return Math.round(price / pipSize);
}

export function ticksToPrice(ticks: number, pipSize: number): number {
  return ticks * pipSize;
}
