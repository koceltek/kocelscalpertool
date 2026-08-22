import type { IndicesTimeframe } from "./config";

export type IndexCategory = "VOLATILITY" | "CRASH_BOOM" | "JUMP" | "STEP" | "OTHER_SYNTHETIC";
export type IndexHealthState = "INITIALIZING" | "LOADING_HISTORY" | "CONNECTING" | "LIVE" | "STALE" | "DISCONNECTED" | "ERROR" | "SUSPENDED" | "CLOSED";
export type DataQuality = "EXCELLENT" | "GOOD" | "DEGRADED" | "BAD";

export type IndicesSymbol = {
  symbol: string;
  displayName: string;
  market: "synthetic";
  submarket: string;
  subgroup: string;
  category: IndexCategory;
  pipSize: number | null;
  precision: number;
  isOpen: boolean;
  isSuspended: boolean;
  enabled: boolean;
  preferredTimeframes: readonly IndicesTimeframe[];
  dataRequirements: { minTicks: number };
};

export type IndicesTick = {
  symbol: string;
  price: number;
  epoch: number;
  timestamp: string;
  tickId: string | null;
  pipSize: number | null;
  receivedAt: number;
};

export type IndicesCandle = {
  symbol: string;
  timeframe: IndicesTimeframe;
  open: number;
  high: number;
  low: number;
  close: number;
  startTime: number;
  endTime: number;
  tickCount: number;
  isClosed: boolean;
};

export type VolatilityData = {
  tickHigh: Record<number, number | null>;
  tickLow: Record<number, number | null>;
  tickRange: Record<number, number | null>;
  standardDeviation: number | null;
  averageTickChange: number | null;
  ticksPerSecond: number | null;
  priceChangePerTick: number | null;
  priceChangePerSecond: number | null;
  acceleration: number | null;
};

export type IndicesMarketState = {
  symbol: string;
  price: number | null;
  lastTick: IndicesTick | null;
  tickCount: number;
  dataAge: number | null;
  lastTickTime: number | null;
  lastTickReceived: number | null;
  connectionState: IndexHealthState;
  marketState: "AVAILABLE" | "SUSPENDED" | "CLOSED" | "UNKNOWN";
  candles: Record<number, IndicesCandle[]>;
  volatilityData: VolatilityData;
  ready: boolean;
};

export type IndicesDataHealth = {
  state: IndexHealthState;
  quality: DataQuality;
  dataAge: number | null;
  latencyMs: number | null;
  historyLoaded: boolean;
  subscribed: boolean;
  subscriptionId: string | null;
  error: string | null;
};

export type IndicesMarketSnapshot = {
  symbol: string;
  timestamp: number;
  price: number | null;
  tick: IndicesTick | null;
  recentTicks: readonly IndicesTick[];
  candles: Record<number, readonly IndicesCandle[]>;
  metadata: IndicesSymbol | null;
  marketState: IndicesMarketState;
  dataHealth: IndicesDataHealth;
};

export type IndicesEngineStatus = "STOPPED" | "INITIALIZING" | "CONNECTING" | "LOADING_DATA" | "SUBSCRIBING" | "READY" | "PARTIALLY_READY" | "WAITING_FOR_DATA" | "ERROR";
export type IndicesEngineSnapshot = {
  status: IndicesEngineStatus;
  running: boolean;
  serverTimeOffset: number;
  configuredCount: number;
  readyCount: number;
  message: string | null;
  symbols: Record<string, IndicesMarketSnapshot>;
};

export type IndicesDataEvent =
  | { type: "INDEX_DISCOVERED"; payload: IndicesSymbol }
  | { type: "INDEX_READY"; payload: IndicesMarketSnapshot }
  | { type: "TICK_RECEIVED"; payload: IndicesTick }
  | { type: "CANDLE_UPDATED" | "CANDLE_OPENED" | "CANDLE_CLOSED"; payload: IndicesCandle }
  | { type: "DATA_STALE" | "DATA_RECOVERED" | "CONNECTION_LOST" | "CONNECTION_RESTORED"; payload: { symbol?: string } };
