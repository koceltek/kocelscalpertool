import type { BotType } from "./contracts";

export type MarketDefinition = {
  /** Deriv symbol the Phase 3 data engine will subscribe to. */
  symbol: string;
  label: string;
  description: string;
};

/**
 * Market catalogues are per bot so additional pairs / indices can be appended
 * later without touching the UI.
 */
export const FOREX_MARKETS: MarketDefinition[] = [
  { symbol: "frxEURUSD", label: "EUR/USD", description: "Euro / US Dollar" },
  { symbol: "frxUSDJPY", label: "USD/JPY", description: "US Dollar / Japanese Yen" },
  { symbol: "frxGBPUSD", label: "GBP/USD", description: "British Pound / US Dollar" },
];

export const INDICES_MARKETS: MarketDefinition[] = [
  { symbol: "R_10", label: "Volatility 10", description: "Synthetic index · 10% volatility" },
  { symbol: "R_25", label: "Volatility 25", description: "Synthetic index · 25% volatility" },
  { symbol: "R_50", label: "Volatility 50", description: "Synthetic index · 50% volatility" },
];

export function marketsFor(botType: BotType): MarketDefinition[] {
  return botType === "forex" ? FOREX_MARKETS : INDICES_MARKETS;
}

export function marketLabel(botType: BotType, symbol: string): string {
  return marketsFor(botType).find((m) => m.symbol === symbol)?.label ?? symbol;
}
