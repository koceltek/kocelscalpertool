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
export const INDICES_MARKETS: MarketDefinition[] = [
  { symbol: "R_10", label: "Volatility 10", description: "Synthetic index · 10% volatility" },
  { symbol: "R_25", label: "Volatility 25", description: "Synthetic index · 25% volatility" },
  { symbol: "R_50", label: "Volatility 50", description: "Synthetic index · 50% volatility" },
];

export function marketsFor(): MarketDefinition[] {
  return INDICES_MARKETS;
}

export function marketLabel(symbol: string): string {
  return INDICES_MARKETS.find((m) => m.symbol === symbol)?.label ?? symbol;
}
