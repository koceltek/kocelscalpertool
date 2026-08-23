import { INDICES_ALLOWED_SYMBOLS, INDICES_TIMEFRAMES } from "./config";
import { getDecimalPrecision, getPipSize } from "./price";
import type { IndexCategory, IndicesSymbol } from "./types";

type RawSymbol = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value : "";
const bool = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string" && value !== "") return value !== "0" && value.toLowerCase() !== "false";
  return fallback;
};

export function classifyIndex(raw: RawSymbol): IndexCategory {
  const value = `${text(raw["underlying_symbol_type"])} ${text(raw["subgroup"])} ${text(raw["underlying_symbol_name"])} ${text(raw["underlying_symbol"])}`.toUpperCase();
  if (value.includes("CRASH") || value.includes("BOOM")) return "CRASH_BOOM";
  if (value.includes("JUMP")) return "JUMP";
  if (value.includes("STEP")) return "STEP";
  if (value.includes("VOLATILITY") || value.includes("R_")) return "VOLATILITY";
  return "OTHER_SYNTHETIC";
}

export function normalizeIndex(raw: RawSymbol): IndicesSymbol | null {
  const symbol = text(raw["underlying_symbol"]) || text(raw["symbol"]);
  if (!symbol) return null;
  const market = text(raw["market"]).toLowerCase();
  const type = text(raw["underlying_symbol_type"]).toLowerCase();
  const name = text(raw["underlying_symbol_name"]) || text(raw["display_name"]);
  if (market !== "synthetic" && type !== "synthetic" && !/^(r_|1hz|crash|boom|jump|step)/i.test(symbol) && !/volatility/i.test(name)) return null;
  const pipSize = getPipSize(raw["pip_size"]);
  const displayName = name || symbol;
  const volatilityNumber = displayName.match(/volatility\s*(\d+)/i)?.[1];
  const enabled = INDICES_ALLOWED_SYMBOLS.includes(symbol) || Boolean(volatilityNumber && INDICES_ALLOWED_SYMBOLS.some((allowed) => allowed.match(/(?:R_|1HZ)(\d+)/i)?.[1] === volatilityNumber));
  return {
    symbol, displayName, market: "synthetic", submarket: text(raw["submarket"]), subgroup: text(raw["subgroup"]),
    category: classifyIndex(raw), pipSize, precision: getDecimalPrecision(1, pipSize),
    isOpen: bool(raw["exchange_is_open"], true), isSuspended: bool(raw["is_trading_suspended"], false),
    enabled, preferredTimeframes: INDICES_TIMEFRAMES,
    dataRequirements: { minTicks: 100 },
  };
}

export class IndicesSymbolRegistry {
  private symbols = new Map<string, IndicesSymbol>();
  update(rawSymbols: RawSymbol[], allowedSymbols = INDICES_ALLOWED_SYMBOLS) {
    for (const raw of rawSymbols) {
      const symbol = normalizeIndex(raw);
      if (symbol) this.symbols.set(symbol.symbol, symbol);
    }
    const configured = new Set(allowedSymbols);
    for (const [symbol, value] of this.symbols) {
      const volatilityNumber = value.displayName.match(/volatility\s*(\d+)/i)?.[1];
      const matchesConfigured = configured.has(symbol) || Boolean(
        volatilityNumber && [...configured].some((allowed) => allowed.match(/(?:R_|1HZ)(\d+)/i)?.[1] === volatilityNumber),
      );
      this.symbols.set(symbol, { ...value, enabled: matchesConfigured });
    }
    return this.list();
  }
  list() { return [...this.symbols.values()].map((symbol) => ({ ...symbol })); }
  get(symbol: string) { const value = this.symbols.get(symbol); return value ? { ...value } : null; }
  updateAvailability(symbol: string, isOpen: boolean, isSuspended: boolean) {
    const current = this.symbols.get(symbol);
    if (current) this.symbols.set(symbol, { ...current, isOpen, isSuspended });
  }
  enabled() { return this.list().filter((symbol) => symbol.enabled); }
  clear() { this.symbols.clear(); }
}
