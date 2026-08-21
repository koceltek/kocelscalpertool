import type { CandleTimeframe, ForexPairId } from "./config";

/** Availability of a market as reported by Deriv. */
export type MarketAvailability = "AVAILABLE" | "CLOSED" | "SUSPENDED" | "UNKNOWN";

/** Per-symbol data health. */
export type SymbolDataStatus =
  | "INITIALIZING"
  | "CONNECTING"
  | "LIVE"
  | "STALE"
  | "DISCONNECTED"
  | "SUSPENDED"
  | "CLOSED"
  | "ERROR";

/** Global engine state. */
export type ForexDataEngineStatus =
  | "OFFLINE"
  | "INITIALIZING"
  | "CONNECTING"
  | "PARTIALLY_LIVE"
  | "LIVE"
  | "DEGRADED"
  | "ERROR"
  | "STOPPED";

/** Normalized symbol definition, populated from active_symbols. */
export type ForexSymbol = {
  id: ForexPairId;
  displayName: string;
  underlyingSymbol: string;
  market: "forex";
  pipSize: number;
  available: boolean;
  tradingSuspended: boolean;
  availability: MarketAvailability;
};

/** Normalized tick — the only tick shape any consumer ever sees. */
export type ForexTick = {
  id: ForexPairId;
  symbol: string;
  displayName: string;
  price: number;
  bid: number | null;
  ask: number | null;
  spread: number | null;
  epoch: number;
  timestamp: string;
  tickId: string | null;
  pipSize: number;
};

/** Compact historical/buffered point. */
export type ForexTickPoint = {
  price: number;
  epoch: number;
  bid?: number | null;
  ask?: number | null;
};

export type ForexCandle = {
  symbol: string;
  timeframe: CandleTimeframe;
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;
  endTime: number;
  tickCount: number;
  complete: boolean;
};

/** Per-symbol snapshot exposed to consumers (immutable copy). */
export type ForexSymbolSnapshot = {
  id: ForexPairId;
  displayName: string;
  symbol: string | null;
  status: SymbolDataStatus;
  availability: MarketAvailability;
  latestPrice: number | null;
  previousPrice: number | null;
  priceChange: number | null;
  absolutePriceChange: number | null;
  percentageChange: number | null;
  pipChange: number | null;
  currentSpread: number | null;
  averageSpread: number | null;
  maximumRecentSpread: number | null;
  lastTickTime: number | null;
  dataAgeMs: number | null;
  tickCount: number;
  historyLoaded: boolean;
  subscribed: boolean;
  subscriptionId: string | null;
  ready: boolean;
  error: string | null;
};

export type ForexDataSnapshot = {
  engineStatus: ForexDataEngineStatus;
  connected: boolean;
  reconnectAttempts: number;
  lastMessageTime: number | null;
  lastTickTime: number | null;
  subscriptionCount: number;
  dataReady: boolean;
  usingMockProvider: boolean;
  message: string;
  symbols: Record<string, ForexSymbolSnapshot>;
};

export type ForexDataEvent =
  | { type: "TICK_RECEIVED"; payload: ForexTick }
  | { type: "SNAPSHOT"; payload: ForexDataSnapshot }
  | { type: "CANDLE_COMPLETED"; payload: ForexCandle };
