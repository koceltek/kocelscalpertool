/** Field labels the Forex data + strategy engines will populate. */
export const FOREX_MARKET_FIELDS = [
  "Bid / Ask",
  "Spread",
  "Session",
  "Feed status",
];

export const FOREX_SIGNAL_FIELDS = [
  "Pair",
  "Direction",
  "Confidence",
  "Duration",
  "Trend (EMA)",
  "Momentum (RSI / MACD)",
  "Volatility (ATR)",
  "Entry trigger",
];

export const FOREX_ANALYSIS_SECTIONS: { title: string; description: string; fields: string[] }[] = [
  {
    title: "Trend analysis",
    description: "EMA stack and slope across the entry timeframe.",
    fields: ["EMA 9", "EMA 21", "EMA 50", "Trend bias"],
  },
  {
    title: "Momentum analysis",
    description: "Oscillator agreement before an entry is allowed.",
    fields: ["RSI", "MACD histogram", "Momentum bias", "Divergence"],
  },
  {
    title: "Volatility analysis",
    description: "Spread and range filters that block low-quality entries.",
    fields: ["ATR", "Bollinger width", "Spread filter", "Volatility state"],
  },
  {
    title: "Market structure",
    description: "Support, resistance and swing context for the pair.",
    fields: ["Support", "Resistance", "Swing structure", "Breakout risk"],
  },
  {
    title: "Multi-timeframe confirmation",
    description: "Higher timeframe alignment required for the signal to pass.",
    fields: ["M1 bias", "M5 bias", "M15 bias", "Alignment"],
  },
];

export const FOREX_HISTORY_COLUMNS = [
  "Time",
  "Pair",
  "Direction",
  "Stake",
  "Duration",
  "Entry",
  "Exit",
  "Result",
  "P/L",
];
