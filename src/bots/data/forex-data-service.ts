import {
  FOREX_HEALTH_INTERVAL_MS,
  FOREX_HISTORY_TICK_COUNT,
  FOREX_STALE_THRESHOLD_MS,
  FOREX_TICK_BUFFER_SIZE,
  SUPPORTED_FOREX_PAIRS,
  type CandleTimeframe,
  type ForexPairId,
} from "./config";
import { DerivMarketDataConnection } from "./connection";
import { ForexCandleAggregator } from "./candle-aggregator";
import { FOREX_DATA_SCOPE, dataLogger } from "./logger";
import { TickBuffer } from "./tick-buffer";
import { isValidEpoch, isValidPrice, optionalPrice, resolvePipSize } from "./validation";
import type {
  ForexCandle,
  ForexDataEngineStatus,
  ForexDataSnapshot,
  ForexSymbol,
  ForexSymbolSnapshot,
  ForexTick,
  ForexTickPoint,
  MarketAvailability,
  SymbolDataStatus,
} from "./types";

const SPREAD_WINDOW = 50;

type SymbolState = {
  definition: ForexSymbol;
  status: SymbolDataStatus;
  buffer: TickBuffer;
  candles: ForexCandleAggregator;
  latestTick: ForexTick | null;
  previousPrice: number | null;
  spreads: number[];
  historyLoaded: boolean;
  subscriptionId: string | null;
  subscribed: boolean;
  lastUpdate: number | null;
  error: string | null;
};

type TickListener = (tick: ForexTick) => void;
type SnapshotListener = (snapshot: ForexDataSnapshot) => void;
type CandleListener = (candle: ForexCandle) => void;

/**
 * ForexMarketDataService — the single source of truth for Forex market data.
 *
 * Responsibilities: connect, discover symbols, load history, subscribe to
 * ticks, normalize + validate, maintain rolling buffers and candles, detect
 * stale data, manage subscriptions and reconnection, and expose immutable
 * snapshots plus a TICK_RECEIVED event stream.
 *
 * It contains NO strategy logic and never places, proposes or modifies trades.
 */
class ForexMarketDataService {
  private connection = new DerivMarketDataConnection();
  private symbols = new Map<ForexPairId, SymbolState>();
  private tickListeners = new Set<TickListener>();
  private snapshotListeners = new Set<SnapshotListener>();
  private candleListeners = new Set<CandleListener>();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private engineStatus: ForexDataEngineStatus = "OFFLINE";
  private message = "Market data offline.";
  private serverTimeOffsetMs = 0;
  private starting: Promise<void> | null = null;
  private running = false;
  private consumers = 0;
  private unsubscribeStream: (() => void) | null = null;
  private unsubscribeState: (() => void) | null = null;
  private mockMode = false;

  constructor() {
    for (const pair of SUPPORTED_FOREX_PAIRS) {
      this.symbols.set(pair.id, this.blankState(pair.id, pair.displayName, pair.expectedSymbol));
    }
  }

  private blankState(id: ForexPairId, displayName: string, expectedSymbol: string): SymbolState {
    return {
      definition: {
        id,
        displayName,
        underlyingSymbol: expectedSymbol,
        market: "forex",
        pipSize: id === "USDJPY" ? 0.01 : 0.0001,
        available: false,
        tradingSuspended: false,
        availability: "UNKNOWN",
      },
      status: "INITIALIZING",
      buffer: new TickBuffer(FOREX_TICK_BUFFER_SIZE),
      candles: new ForexCandleAggregator(expectedSymbol),
      latestTick: null,
      previousPrice: null,
      spreads: [],
      historyLoaded: false,
      subscriptionId: null,
      subscribed: false,
      lastUpdate: null,
      error: null,
    };
  }

  // ---------------------------------------------------------------- lifecycle

  /** Acquire the engine (ref-counted so the socket is shared, never duplicated). */
  acquire(): () => void {
    this.consumers += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.consumers = Math.max(0, this.consumers - 1);
    };
  }

  get isRunning() {
    return this.running;
  }

  /** initialize() + connect() + history + subscriptions. Idempotent. */
  async initialize(): Promise<void> {
    if (this.running) return;
    if (this.starting) return this.starting;

    this.starting = (async () => {
      this.running = true;
      this.setEngineStatus("INITIALIZING", "Connecting market data...");
      this.attachConnection();
      try {
        await this.connection.connect();
        this.setEngineStatus("CONNECTING", "Loading market data...");
        await this.syncServerTime();
        await this.discoverSymbols();
        await this.loadHistoryForAll();
        await this.subscribeAll();
        this.startHealthMonitor();
        this.evaluateEngineStatus();
        dataLogger.info(FOREX_DATA_SCOPE, "Data stream LIVE");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        dataLogger.error(FOREX_DATA_SCOPE, "Initialization failed", detail);
        this.setEngineStatus("ERROR", "Market data connection lost. Reconnecting...");
        this.startHealthMonitor();
      } finally {
        this.starting = null;
      }
    })();

    return this.starting;
  }

  async connect() {
    return this.initialize();
  }

  /**
   * Stops the engine. Callers decide whether stopping a bot should also stop
   * the data stream — there is no hardcoded coupling.
   */
  disconnect(force = false) {
    if (!force && this.consumers > 0) {
      dataLogger.info(FOREX_DATA_SCOPE, "Stop requested but other consumers remain — stream kept alive");
      return;
    }
    this.running = false;
    this.stopHealthMonitor();
    this.forgetAll();
    this.unsubscribeStream?.();
    this.unsubscribeState?.();
    this.unsubscribeStream = null;
    this.unsubscribeState = null;
    this.connection.close();
    for (const state of this.symbols.values()) {
      state.subscribed = false;
      state.subscriptionId = null;
      state.status = "DISCONNECTED";
    }
    this.setEngineStatus("STOPPED", "Market data stopped.");
    dataLogger.info(FOREX_DATA_SCOPE, "Data engine stopped");
  }

  private attachConnection() {
    if (!this.unsubscribeStream) {
      this.unsubscribeStream = this.connection.onStream((msg) => this.handleStreamMessage(msg));
    }
    if (!this.unsubscribeState) {
      this.unsubscribeState = this.connection.onStateChange((connected, reason) => {
        if (connected) {
          if (this.running) void this.restoreAfterReconnect();
        } else if (reason !== "stopped" && this.running) {
          for (const state of this.symbols.values()) {
            state.subscribed = false;
            state.subscriptionId = null;
            if (state.status === "LIVE" || state.status === "STALE") state.status = "DISCONNECTED";
          }
          this.setEngineStatus("CONNECTING", "Market data connection lost. Reconnecting...");
        }
      });
    }
  }

  private async restoreAfterReconnect() {
    try {
      dataLogger.info(FOREX_DATA_SCOPE, "Restoring symbols and subscriptions after reconnect");
      await this.syncServerTime();
      await this.discoverSymbols();
      await this.loadHistoryForAll();
      await this.subscribeAll();
      this.evaluateEngineStatus();
    } catch (error) {
      dataLogger.error(FOREX_DATA_SCOPE, "Restore after reconnect failed", error);
    }
  }

  // ------------------------------------------------------------ server clock

  private async syncServerTime() {
    try {
      const response = await this.connection.send({ time: 1 });
      const serverTime = response["time"];
      if (isValidEpoch(serverTime)) {
        this.serverTimeOffsetMs = serverTime * 1000 - Date.now();
      }
    } catch (error) {
      dataLogger.warn(FOREX_DATA_SCOPE, "Server time sync failed", error);
    }
  }

  /** Deriv-aligned "now" in ms — never relies solely on the device clock. */
  private serverNow() {
    return Date.now() + this.serverTimeOffsetMs;
  }

  // -------------------------------------------------------- symbol discovery

  private async discoverSymbols() {
    const response = await this.connection.send({ active_symbols: "brief", product_type: "basic" });
    const list = Array.isArray(response["active_symbols"]) ? (response["active_symbols"] as unknown[]) : [];
    dataLogger.info(FOREX_DATA_SCOPE, `Active symbols received (${list.length})`);

    for (const pair of SUPPORTED_FOREX_PAIRS) {
      const state = this.symbols.get(pair.id)!;
      const entry = list.find((item) => {
        if (typeof item !== "object" || item === null) return false;
        const record = item as Record<string, unknown>;
        const symbol = record["underlying_symbol"] ?? record["symbol"];
        return symbol === pair.expectedSymbol;
      }) as Record<string, unknown> | undefined;

      if (!entry) {
        state.definition = {
          ...state.definition,
          available: false,
          availability: "UNKNOWN",
        };
        state.status = "ERROR";
        state.error = "Market not offered by Deriv right now.";
        dataLogger.warn(FOREX_DATA_SCOPE, `${pair.displayName} unavailable — not returned by active_symbols`);
        continue;
      }

      const suspended = entry["is_trading_suspended"] === 1 || entry["is_trading_suspended"] === true;
      const open = entry["exchange_is_open"] === 1 || entry["exchange_is_open"] === true;
      const availability: MarketAvailability = suspended ? "SUSPENDED" : open ? "AVAILABLE" : "CLOSED";
      const underlyingSymbol =
        typeof entry["underlying_symbol"] === "string"
          ? (entry["underlying_symbol"] as string)
          : typeof entry["symbol"] === "string"
            ? (entry["symbol"] as string)
            : pair.expectedSymbol;

      state.definition = {
        ...state.definition,
        underlyingSymbol,
        displayName:
          typeof entry["display_name"] === "string" ? (entry["display_name"] as string) : pair.displayName,
        pipSize: resolvePipSize(entry["pip"] ?? entry["pip_size"], state.definition.pipSize),
        available: availability === "AVAILABLE",
        tradingSuspended: suspended,
        availability,
      };
      state.error = null;
      state.status =
        availability === "AVAILABLE"
          ? "CONNECTING"
          : availability === "SUSPENDED"
            ? "SUSPENDED"
            : availability === "CLOSED"
              ? "CLOSED"
              : "ERROR";
      dataLogger.info(FOREX_DATA_SCOPE, `${pair.displayName} resolved as ${underlyingSymbol} (${availability})`);
    }
  }

  // ------------------------------------------------------------ history load

  private async loadHistoryForAll() {
    await Promise.allSettled(
      [...this.symbols.values()]
        .filter((state) => state.definition.available)
        .map((state) => this.loadHistory(state)),
    );
  }

  private async loadHistory(state: SymbolState) {
    try {
      const response = await this.connection.send({
        ticks_history: state.definition.underlyingSymbol,
        adjust_start_time: 1,
        count: FOREX_HISTORY_TICK_COUNT,
        end: "latest",
        style: "ticks",
      });
      const history = response["history"] as { prices?: unknown; times?: unknown } | undefined;
      const prices = Array.isArray(history?.prices) ? (history!.prices as unknown[]) : null;
      const times = Array.isArray(history?.times) ? (history!.times as unknown[]) : null;
      if (!prices || !times) throw new Error("History response missing prices/times");

      const length = Math.min(prices.length, times.length);
      const points: ForexTickPoint[] = [];
      let rejected = 0;
      for (let i = 0; i < length; i += 1) {
        const price = Number(prices[i]);
        const epoch = Number(times[i]);
        if (!isValidPrice(price) || !isValidEpoch(epoch)) {
          rejected += 1;
          continue;
        }
        points.push({ price, epoch });
      }

      state.buffer.reset(points);
      state.candles.seed(state.buffer.toArray());
      state.historyLoaded = state.buffer.size > 0;
      const latest = state.buffer.latest;
      state.previousPrice = state.buffer.previous?.price ?? null;
      if (latest) state.lastUpdate = latest.epoch * 1000;
      dataLogger.info(
        FOREX_DATA_SCOPE,
        `${state.definition.displayName} historical buffer initialized (${state.buffer.size} ticks${
          rejected > 0 ? `, ${rejected} malformed rejected` : ""
        })`,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      state.historyLoaded = false;
      state.error = "Historical market data unavailable.";
      dataLogger.error(FOREX_DATA_SCOPE, `${state.definition.displayName} history error`, detail);
    }
  }

  // ------------------------------------------------------- tick subscription

  private async subscribeAll() {
    await Promise.allSettled(
      [...this.symbols.values()]
        .filter((state) => state.definition.available && !state.subscribed)
        .map((state) => this.subscribeState(state)),
    );
  }

  async subscribe(id: ForexPairId) {
    const state = this.symbols.get(id);
    if (!state || !state.definition.available || state.subscribed) return;
    await this.subscribeState(state);
  }

  private async subscribeState(state: SymbolState) {
    try {
      const response = await this.connection.send({
        ticks: state.definition.underlyingSymbol,
        subscribe: 1,
      });
      const subscription = response["subscription"] as { id?: unknown } | undefined;
      state.subscriptionId = typeof subscription?.id === "string" ? subscription.id : null;
      state.subscribed = true;
      dataLogger.info(FOREX_DATA_SCOPE, `${state.definition.displayName} subscription established`);
      const tick = response["tick"];
      if (tick && typeof tick === "object") this.ingestRawTick(tick as Record<string, unknown>);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      state.subscribed = false;
      state.status = "ERROR";
      state.error = "Live market data unavailable for this market.";
      dataLogger.error(FOREX_DATA_SCOPE, `${state.definition.displayName} subscription error`, detail);
      // Isolated failure: other symbols keep streaming.
    }
  }

  unsubscribe(id: ForexPairId) {
    const state = this.symbols.get(id);
    if (!state) return;
    if (state.subscriptionId) this.connection.sendRaw({ forget: state.subscriptionId });
    state.subscribed = false;
    state.subscriptionId = null;
    if (state.status === "LIVE" || state.status === "STALE") state.status = "DISCONNECTED";
    this.evaluateEngineStatus();
  }

  private forgetAll() {
    this.connection.sendRaw({ forget_all: "ticks" });
  }

  private handleStreamMessage(message: Record<string, unknown>) {
    const error = message["error"] as { message?: string } | undefined;
    if (error) {
      dataLogger.warn(FOREX_DATA_SCOPE, "Deriv message error", error.message);
      return;
    }
    const tick = message["tick"];
    if (tick && typeof tick === "object") {
      this.ingestRawTick(tick as Record<string, unknown>);
    }
  }

  // --------------------------------------------------------- tick processing

  private stateBySymbol(symbol: string): SymbolState | null {
    for (const state of this.symbols.values()) {
      if (state.definition.underlyingSymbol === symbol) return state;
    }
    return null;
  }

  private ingestRawTick(raw: Record<string, unknown>) {
    const symbol =
      typeof raw["underlying_symbol"] === "string"
        ? (raw["underlying_symbol"] as string)
        : typeof raw["symbol"] === "string"
          ? (raw["symbol"] as string)
          : null;
    if (!symbol) {
      dataLogger.warn(FOREX_DATA_SCOPE, "Invalid tick rejected: missing symbol");
      return;
    }
    const state = this.stateBySymbol(symbol);
    if (!state) return; // not one of our markets

    const price = Number(raw["quote"]);
    const epoch = Number(raw["epoch"]);
    if (!isValidPrice(price)) {
      dataLogger.warn(FOREX_DATA_SCOPE, `Invalid tick rejected for ${symbol}: bad price`, raw["quote"]);
      return;
    }
    if (!isValidEpoch(epoch)) {
      dataLogger.warn(FOREX_DATA_SCOPE, `Invalid tick rejected for ${symbol}: bad timestamp`, raw["epoch"]);
      return;
    }

    const bid = optionalPrice(raw["bid"]);
    const ask = optionalPrice(raw["ask"]);
    const pipSize = resolvePipSize(raw["pip_size"], state.definition.pipSize);
    state.definition = { ...state.definition, pipSize };

    const point: ForexTickPoint = { price, epoch, bid, ask };

    if (state.buffer.isDuplicate(point)) return; // duplicate protection

    if (state.buffer.isOutOfOrder(point)) {
      dataLogger.warn(
        FOREX_DATA_SCOPE,
        `${state.definition.displayName} out-of-order tick preserved without replacing latest state`,
        { epoch },
      );
      state.buffer.insertOrdered(point);
      return;
    }

    state.previousPrice = state.buffer.latest?.price ?? state.previousPrice;
    state.buffer.append(point);

    const spread = bid !== null && ask !== null && ask >= bid ? ask - bid : null;
    if (spread !== null) {
      state.spreads.push(spread);
      if (state.spreads.length > SPREAD_WINDOW) state.spreads.shift();
    }

    const tick: ForexTick = {
      id: state.definition.id,
      symbol,
      displayName: state.definition.displayName,
      price,
      bid,
      ask,
      spread,
      epoch,
      timestamp: new Date(epoch * 1000).toISOString(),
      tickId: typeof raw["id"] === "string" ? (raw["id"] as string) : null,
      pipSize,
    };

    state.latestTick = tick;
    state.lastUpdate = epoch * 1000;
    state.status = "LIVE";
    state.error = null;

    const closed = state.candles.add(point);

    this.emitTick(tick);
    for (const candle of closed) this.emitCandle(candle);
    this.evaluateEngineStatus();
  }

  /** Test-only entry point used by MockForexDataProvider. */
  injectTestTick(id: ForexPairId, point: ForexTickPoint) {
    if (!import.meta.env.DEV) return;
    const state = this.symbols.get(id);
    if (!state) return;
    this.mockMode = true;
    this.ingestRawTick({
      underlying_symbol: state.definition.underlyingSymbol,
      quote: point.price,
      epoch: point.epoch,
    });
  }

  // ------------------------------------------------------------------ health

  private startHealthMonitor() {
    if (this.healthTimer) return;
    this.healthTimer = setInterval(() => {
      const now = this.serverNow();
      for (const state of this.symbols.values()) {
        if (state.status === "LIVE" && state.lastUpdate !== null) {
          if (now - state.lastUpdate > FOREX_STALE_THRESHOLD_MS) {
            state.status = "STALE";
            dataLogger.warn(FOREX_DATA_SCOPE, `${state.definition.displayName} data stream stale`);
          }
        }
      }
      this.evaluateEngineStatus();
    }, FOREX_HEALTH_INTERVAL_MS);
  }

  private stopHealthMonitor() {
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.healthTimer = null;
  }

  // ---------------------------------------------------------------- snapshot

  private symbolSnapshot(state: SymbolState): ForexSymbolSnapshot {
    const latest = state.latestTick;
    const previous = state.previousPrice;
    const latestPrice = latest?.price ?? state.buffer.latest?.price ?? null;
    const priceChange =
      latestPrice !== null && previous !== null ? Number((latestPrice - previous).toFixed(8)) : null;
    const dataAgeMs = state.lastUpdate !== null ? Math.max(0, this.serverNow() - state.lastUpdate) : null;
    const spreads = state.spreads;
    const averageSpread =
      spreads.length > 0 ? spreads.reduce((sum, value) => sum + value, 0) / spreads.length : null;

    return {
      id: state.definition.id,
      displayName: state.definition.displayName,
      symbol: state.definition.underlyingSymbol,
      status: state.status,
      availability: state.definition.availability,
      latestPrice,
      previousPrice: previous,
      priceChange,
      absolutePriceChange: priceChange === null ? null : Math.abs(priceChange),
      percentageChange:
        priceChange !== null && previous ? Number(((priceChange / previous) * 100).toFixed(6)) : null,
      pipChange:
        priceChange !== null ? Number((priceChange / state.definition.pipSize).toFixed(3)) : null,
      currentSpread: latest?.spread ?? null,
      averageSpread,
      maximumRecentSpread: spreads.length > 0 ? Math.max(...spreads) : null,
      lastTickTime: latest?.epoch ?? null,
      dataAgeMs,
      tickCount: state.buffer.size,
      historyLoaded: state.historyLoaded,
      subscribed: state.subscribed,
      subscriptionId: state.subscriptionId,
      ready: this.isSymbolReady(state),
      error: state.error,
    };
  }

  /** Ready = valid, available, history loaded, subscribed, fresh tick present. */
  private isSymbolReady(state: SymbolState) {
    if (!state.definition.available || state.definition.tradingSuspended) return false;
    if (!state.historyLoaded || !state.subscribed) return false;
    if (state.status !== "LIVE" || state.latestTick === null) return false;
    if (state.lastUpdate === null) return false;
    return this.serverNow() - state.lastUpdate <= FOREX_STALE_THRESHOLD_MS;
  }

  isDataReady(id?: ForexPairId): boolean {
    if (id) {
      const state = this.symbols.get(id);
      return state ? this.isSymbolReady(state) : false;
    }
    return [...this.symbols.values()].some((state) => this.isSymbolReady(state));
  }

  dataReadySymbols(): Record<string, "READY" | "NOT_READY"> {
    const result: Record<string, "READY" | "NOT_READY"> = {};
    for (const state of this.symbols.values()) {
      result[state.definition.id] = this.isSymbolReady(state) ? "READY" : "NOT_READY";
    }
    return result;
  }

  private setEngineStatus(status: ForexDataEngineStatus, message: string) {
    if (this.engineStatus === status && this.message === message) return;
    this.engineStatus = status;
    this.message = message;
    this.emitSnapshot();
  }

  private evaluateEngineStatus() {
    if (!this.running) {
      this.setEngineStatus(this.engineStatus === "OFFLINE" ? "OFFLINE" : "STOPPED", "Market data stopped.");
      return;
    }
    if (!this.connection.connected) {
      this.setEngineStatus("CONNECTING", "Market data connection lost. Reconnecting...");
      return;
    }
    const states = [...this.symbols.values()];
    const eligible = states.filter((state) => state.definition.available);
    const live = eligible.filter((state) => this.isSymbolReady(state));

    if (eligible.length === 0) {
      this.setEngineStatus("ERROR", "No Forex market is currently available.");
      return;
    }
    if (live.length === eligible.length && eligible.length === states.length) {
      this.setEngineStatus("LIVE", "Market data live.");
      return;
    }
    if (live.length === eligible.length) {
      this.setEngineStatus("PARTIALLY_LIVE", "Market data live for the open markets.");
      return;
    }
    if (live.length > 0) {
      this.setEngineStatus("PARTIALLY_LIVE", "Market data live for some markets.");
      return;
    }
    const anyStale = eligible.some((state) => state.status === "STALE");
    this.setEngineStatus(
      anyStale ? "DEGRADED" : "CONNECTING",
      anyStale ? "Market data delayed." : "Connecting market data...",
    );
  }

  /** Immutable snapshot — internal buffers are never handed out. */
  getSnapshot(): ForexDataSnapshot {
    const symbols: Record<string, ForexSymbolSnapshot> = {};
    for (const state of this.symbols.values()) {
      symbols[state.definition.id] = this.symbolSnapshot(state);
    }
    const health = this.connection.health();
    const lastTickTime = [...this.symbols.values()].reduce<number | null>((latest, state) => {
      const epoch = state.latestTick?.epoch ?? null;
      if (epoch === null) return latest;
      return latest === null || epoch > latest ? epoch : latest;
    }, null);

    return {
      engineStatus: this.engineStatus,
      connected: health.connected,
      reconnectAttempts: health.reconnectAttempts,
      lastMessageTime: health.lastMessageTime,
      lastTickTime,
      subscriptionCount: [...this.symbols.values()].filter((state) => state.subscribed).length,
      dataReady: this.isDataReady(),
      usingMockProvider: this.mockMode,
      message: this.message,
      symbols,
    };
  }

  getConnectionStatus() {
    return this.connection.health();
  }

  getSymbols(): ForexSymbol[] {
    return [...this.symbols.values()].map((state) => ({ ...state.definition }));
  }

  getMarketState(id: ForexPairId): ForexSymbolSnapshot | null {
    const state = this.symbols.get(id);
    return state ? this.symbolSnapshot(state) : null;
  }

  getLatestTick(id: ForexPairId): ForexTick | null {
    const tick = this.symbols.get(id)?.latestTick;
    return tick ? { ...tick } : null;
  }

  getTickHistory(id: ForexPairId, limit?: number): ForexTickPoint[] {
    return this.symbols.get(id)?.buffer.toArray(limit) ?? [];
  }

  getCandles(id: ForexPairId, timeframe: CandleTimeframe): ForexCandle[] {
    return this.symbols.get(id)?.candles.completedCandles(timeframe) ?? [];
  }

  getFormingCandle(id: ForexPairId, timeframe: CandleTimeframe): ForexCandle | null {
    return this.symbols.get(id)?.candles.formingCandle(timeframe) ?? null;
  }

  // ------------------------------------------------------------------ events

  /** TICK_RECEIVED stream for future strategy modules. */
  onTick(listener: TickListener) {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  onSnapshot(listener: SnapshotListener) {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  onCandleCompleted(listener: CandleListener) {
    this.candleListeners.add(listener);
    return () => this.candleListeners.delete(listener);
  }

  private emitTick(tick: ForexTick) {
    for (const listener of this.tickListeners) {
      try {
        listener({ ...tick });
      } catch (error) {
        dataLogger.error(FOREX_DATA_SCOPE, "Tick listener failed", error);
      }
    }
  }

  private emitCandle(candle: ForexCandle) {
    for (const listener of this.candleListeners) {
      try {
        listener({ ...candle });
      } catch (error) {
        dataLogger.error(FOREX_DATA_SCOPE, "Candle listener failed", error);
      }
    }
  }

  private emitSnapshot() {
    if (this.snapshotListeners.size === 0) return;
    const snapshot = this.getSnapshot();
    for (const listener of this.snapshotListeners) {
      try {
        listener(snapshot);
      } catch (error) {
        dataLogger.error(FOREX_DATA_SCOPE, "Snapshot listener failed", error);
      }
    }
  }
}

/** Process-wide singleton: one socket, one data store, one source of truth. */
export const forexMarketDataService = new ForexMarketDataService();
