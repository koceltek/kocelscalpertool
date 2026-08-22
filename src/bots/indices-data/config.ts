import { DERIV_APP_ID, DERIV_WS_URL, RECONNECT_BACKOFF_MS, REQUEST_TIMEOUT_MS } from "@/bots/data/config";

export { DERIV_APP_ID, DERIV_WS_URL, RECONNECT_BACKOFF_MS, REQUEST_TIMEOUT_MS };

export const INDICES_ALLOWED_SYMBOLS = (import.meta.env["VITE_INDICES_ALLOWED_SYMBOLS"] ?? "R_10,R_25,R_50")
  .split(",")
  .map((symbol: string) => symbol.trim())
  .filter(Boolean);

export const INDICES_TICK_BUFFER_SIZE = 2_000;
export const INDICES_HISTORY_TICK_COUNT = 1_000;
export const INDICES_STALE_THRESHOLD_MS = 10_000;
export const INDICES_HEALTH_INTERVAL_MS = 1_000;
export const INDICES_MAX_CANDLES = 300;
export const INDICES_TIMEFRAMES = [1, 60, 300, 900] as const;
export type IndicesTimeframe = (typeof INDICES_TIMEFRAMES)[number];
export const INDICES_METRIC_WINDOWS = [50, 100, 200, 500] as const;
