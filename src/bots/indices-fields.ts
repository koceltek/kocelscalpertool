/** Field labels the Indices data + strategy engines will populate. */
export const INDICES_MARKET_FIELDS = [
  "Last tick",
  "Tick direction",
  "Ticks / minute",
  "Feed status",
];

export const INDICES_SIGNAL_FIELDS = [
  "Index",
  "Direction",
  "Confidence",
  "Duration (ticks)",
  "Tick momentum",
  "Directional pressure",
  "Volatility state",
  "Entry trigger",
];

export const INDICES_ANALYSIS_SECTIONS: {
  title: string;
  description: string;
  fields: string[];
}[] = [
  {
    title: "Tick momentum",
    description: "Streak and strength of consecutive tick moves.",
    fields: ["Up ticks", "Down ticks", "Streak", "Momentum bias"],
  },
  {
    title: "Tick velocity",
    description: "How fast price is moving per tick window.",
    fields: ["Velocity", "Acceleration", "Window size", "Velocity state"],
  },
  {
    title: "Directional pressure",
    description: "Net buying versus selling pressure across the tick buffer.",
    fields: ["Up pressure", "Down pressure", "Net pressure", "Pressure bias"],
  },
  {
    title: "Micro-trend detection",
    description: "Short-horizon trend used for Rise / Fall direction.",
    fields: ["Micro-trend", "Slope", "Stability", "Reversal risk"],
  },
  {
    title: "Volatility & exhaustion",
    description: "Spike and exhaustion filters that veto late entries.",
    fields: ["Volatility spike", "Range expansion", "Exhaustion score", "Filter verdict"],
  },
];

export const INDICES_HISTORY_COLUMNS = [
  "Time",
  "Index",
  "Direction",
  "Stake",
  "Ticks",
  "Entry",
  "Exit",
  "Result",
  "P/L",
];
