/**
 * Phase 3A — Forex live market data engine configuration.
 *
 * Market data is public on Deriv, so this layer uses its own unauthenticated
 * WebSocket connection and never touches the Phase 1 authenticated session.
 */

/** Deriv market-data WebSocket endpoint. */
export const DERIV_WS_URL = "wss://ws.derivws.com/websockets/v3";

/**
 * Numeric Deriv application id used for the public market-data socket.
 * This is NOT the OAuth client id (that one authorises the account session).
 */
export const DERIV_APP_ID = import.meta.env["VITE_DERIV_APP_ID"] ?? "1089";

/** Rolling tick buffer size, per symbol. */
export const FOREX_TICK_BUFFER_SIZE = 1000;

/** Historical ticks requested per symbol before live streaming starts. */
export const FOREX_HISTORY_TICK_COUNT = 500;

/** No tick within this window ⇒ the symbol's data is considered stale. */
export const FOREX_STALE_THRESHOLD_MS = 10_000;

/** How often the health monitor re-evaluates freshness. */
export const FOREX_HEALTH_INTERVAL_MS = 1_000;

/** Reconnect backoff ladder (ms) — capped, never a tight loop. */
export const RECONNECT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

/** Connection is treated as stable (backoff reset) after this uptime. */
export const STABLE_CONNECTION_MS = 20_000;

/** Request timeout for request/response calls over the socket. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Timeframes the candle aggregator is prepared for (seconds). */
export const CANDLE_TIMEFRAMES = [60, 300, 900] as const;
export type CandleTimeframe = (typeof CANDLE_TIMEFRAMES)[number];

/** Max completed candles kept per timeframe. */
export const CANDLE_HISTORY_SIZE = 300;

/** Supported Forex pairs, keyed by internal id. */
export const SUPPORTED_FOREX_PAIRS = [
  { id: "EURUSD", displayName: "EUR/USD", expectedSymbol: "frxEURUSD" },
  { id: "USDJPY", displayName: "USD/JPY", expectedSymbol: "frxUSDJPY" },
  { id: "GBPUSD", displayName: "GBP/USD", expectedSymbol: "frxGBPUSD" },
] as const;

export type ForexPairId = (typeof SUPPORTED_FOREX_PAIRS)[number]["id"];
