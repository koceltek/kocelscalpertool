/** Defensive validation for everything entering the market-data store. */

export function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isValidEpoch(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  // Deriv sends seconds. Accept 2001-09-09 .. +10 years from now.
  const nowSeconds = Math.floor(Date.now() / 1000);
  return value > 1_000_000_000 && value < nowSeconds + 315_360_000;
}

export function optionalPrice(value: unknown): number | null {
  return isValidPrice(value) ? value : null;
}

export function isValidPipSize(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value < 1;
}

/** Derives a pip size from Deriv's `pip` / `pip_size` fields. */
export function resolvePipSize(raw: unknown, fallback: number): number {
  if (isValidPipSize(raw)) return raw;
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0 && raw <= 10) {
    return Number(Math.pow(10, -raw).toFixed(raw));
  }
  return fallback;
}
