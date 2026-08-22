import { DerivMarketDataConnection } from "@/bots/data/connection";
import { dataLogger } from "@/bots/data/logger";
import {
  INDICES_HEALTH_INTERVAL_MS, INDICES_HISTORY_TICK_COUNT, INDICES_STALE_THRESHOLD_MS,
  INDICES_TICK_BUFFER_SIZE, INDICES_TIMEFRAMES, type IndicesTimeframe,
} from "./config";
import { IndicesTickBuffer } from "./buffer";
import { IndicesCandleEngine } from "./candles";
import { normalizePrice } from "./price";
import { IndicesSymbolRegistry } from "./registry";
import { IndicesSubscriptionManager } from "./subscriptions";
import type {
  DataQuality, IndicesCandle, IndicesDataEvent, IndicesDataHealth, IndicesEngineSnapshot,
  IndicesEngineStatus, IndicesMarketSnapshot, IndicesMarketState, IndicesSymbol, IndicesTick,
} from "./types";

type Json = Record<string, unknown>;
type Listener = (event: IndicesDataEvent) => void;
type SymbolState = {
  metadata: IndicesSymbol;
  buffer: IndicesTickBuffer;
  candles: IndicesCandleEngine;
  latest: IndicesTick | null;
  historyLoaded: boolean;
  subscribed: boolean;
  subscriptionId: string | null;
  status: IndicesMarketState["connectionState"];
  error: string | null;
  wasStale: boolean;
  contractSupported: boolean;
};

const INDEX_SCOPE = "INDICES DATA";
const asText = (value: unknown) => typeof value === "string" ? value : null;
const asNumber = (value: unknown) => typeof value === "number" ? value : Number(value);
const asBool = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value !== "0" && value.toLowerCase() !== "false";
  return fallback;
};

export interface MarketDataProvider {
  connect(): Promise<void>;
  close(): void;
  request(payload: Json): Promise<Json>;
  send(payload: Json): void;
  onMessage(handler: (message: Json) => void): () => void;
  onState(handler: (connected: boolean, reason?: string) => void): () => void;
}

export class DerivIndicesDataProvider implements MarketDataProvider {
  private readonly connection = new DerivMarketDataConnection();
  connect() { return this.connection.connect(); }
  close() { this.connection.close(); }
  request(payload: Json) { return this.connection.send(payload); }
  send(payload: Json) { this.connection.sendRaw(payload); }
  onMessage(handler: (message: Json) => void) { return this.connection.onStream(handler); }
  onState(handler: (connected: boolean, reason?: string) => void) { return this.connection.onStateChange(handler); }
}

/** Deterministic adapter for tests only; it never creates market movements. */
export class MockIndicesDataProvider implements MarketDataProvider {
  private messages = new Set<(message: Json) => void>();
  private states = new Set<(connected: boolean, reason?: string) => void>();
  constructor(private readonly responses: Record<string, Json> = {}) {}
  async connect() { for (const handler of this.states) handler(true); }
  close() { for (const handler of this.states) handler(false, "stopped"); }
  async request(payload: Json) {
    const key = Object.keys(payload).find((name) => payload[name] !== undefined) ?? "";
    return this.responses[key] ?? {};
  }
  send(_payload: Json) {}
  onMessage(handler: (message: Json) => void) { this.messages.add(handler); return () => this.messages.delete(handler); }
  onState(handler: (connected: boolean, reason?: string) => void) { this.states.add(handler); return () => this.states.delete(handler); }
  emit(message: Json) { for (const handler of this.messages) handler(message); }
}

function parseHistory(message: Json, symbol: string, pipSize: number | null): IndicesTick[] {
  const history = (message["history"] ?? {}) as Json;
  const prices = Array.isArray(history["prices"]) ? history["prices"] : [];
  const times = Array.isArray(history["times"]) ? history["times"] : [];
  return prices.map((rawPrice, index) => {
    const epoch = asNumber(times[index]);
    const price = normalizePrice(rawPrice);
    if (!price || !Number.isFinite(epoch)) return null;
    const receivedAt = Date.now();
    return { symbol, price, epoch, timestamp: new Date(epoch * 1000).toISOString(), tickId: null, pipSize, receivedAt };
  }).filter((tick): tick is IndicesTick => tick !== null);
}

function parseTick(message: Json, metadata: IndicesSymbol): IndicesTick | null {
  const raw = (message["tick"] ?? message) as Json;
  const price = normalizePrice(raw["quote"] ?? raw["price"]);
  const epoch = asNumber(raw["epoch"]);
  if (!price || !Number.isFinite(epoch)) return null;
  const symbol = asText(raw["symbol"]) ?? metadata.symbol;
  if (symbol !== metadata.symbol) return null;
  const tickId = asText(raw["id"] ?? raw["tick_id"]);
  const receivedAt = Date.now();
  return { symbol, price, epoch, timestamp: new Date(epoch * 1000).toISOString(), tickId, pipSize: metadata.pipSize, receivedAt };
}

export class IndicesDataEngine {
  private readonly provider: MarketDataProvider;
  private readonly registry = new IndicesSymbolRegistry();
  private readonly subscriptions = new IndicesSubscriptionManager();
  private readonly states = new Map<string, SymbolState>();
  private readonly listeners = new Set<Listener>();
  private removeMessage: (() => void) | null = null;
  private removeState: (() => void) | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private startPromise: Promise<void> | null = null;
  private engineStatus: IndicesEngineStatus = "STOPPED";
  private running = false;
  private serverTimeOffset = 0;
  private message: string | null = null;

  constructor(provider: MarketDataProvider = new DerivIndicesDataProvider()) { this.provider = provider; }

  onEvent(listener: Listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  get isRunning() { return this.running; }
  getServerTime() { return Date.now() + this.serverTimeOffset; }
  getServerTimeOffset() { return this.serverTimeOffset; }

  async start() {
    if (this.running) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.startInternal().finally(() => { this.startPromise = null; });
    return this.startPromise;
  }

  private async startInternal() {
    this.running = true; this.engineStatus = "INITIALIZING"; this.message = "Connecting to Deriv market data..."; this.attachProvider();
    this.emit({ type: "CONNECTION_RESTORED", payload: {} });
    try {
      await this.provider.connect(); this.engineStatus = "CONNECTING"; this.message = "Discovering synthetic indices...";
      await this.syncServerTime();
      const response = await this.provider.request({ active_symbols: "brief", product_type: "basic" });
      const rawSymbols = Array.isArray(response["active_symbols"]) ? response["active_symbols"] as Json[] : [];
      this.registry.clear();
      for (const symbol of this.registry.update(rawSymbols)) this.emit({ type: "INDEX_DISCOVERED", payload: symbol });
      await this.refreshTradingTimes();
      const enabled = this.registry.enabled();
      this.engineStatus = "LOADING_DATA"; this.message = "Validating Rise/Fall contracts and loading history...";
      for (const metadata of enabled) this.ensureState(metadata);
      await Promise.allSettled(enabled.map((metadata) => this.validateContracts(metadata)));
      this.engineStatus = "SUBSCRIBING"; this.message = "Subscribing to live index ticks...";
      await Promise.allSettled(enabled.map((metadata) => this.warmSymbol(metadata)));
      this.startHealthMonitor(); this.evaluateEngineStatus(); this.emit({ type: "CONNECTION_RESTORED", payload: {} });
    } catch (error) {
      this.engineStatus = "ERROR"; this.message = error instanceof Error ? error.message : String(error); dataLogger.error(INDEX_SCOPE, "Indices data engine failed", error);
      for (const state of this.states.values()) state.status = "ERROR";
      this.emit({ type: "CONNECTION_LOST", payload: {} });
      throw error;
    }
  }

  stop() {
    this.running = false; this.engineStatus = "STOPPED"; this.stopHealthMonitor();
    for (const state of this.states.values()) {
      const subscriptionId = this.subscriptions.forget(state.metadata.symbol) ?? state.subscriptionId;
      if (subscriptionId) this.provider.send({ forget: subscriptionId });
      state.buffer.clear(); state.candles.clear(); state.latest = null; state.subscribed = false;
      state.subscriptionId = null; state.historyLoaded = false; state.status = "DISCONNECTED";
    }
    this.states.clear(); this.registry.clear(); this.removeMessage?.(); this.removeState?.();
    this.removeMessage = null; this.removeState = null; this.provider.close();
  }

  private attachProvider() {
    this.removeMessage ??= this.provider.onMessage((message) => this.handleMessage(message));
    this.removeState ??= this.provider.onState((connected, reason) => {
      if (!this.running) return;
      if (!connected) { this.subscriptions.clear(); for (const state of this.states.values()) { state.subscribed = false; state.subscriptionId = null; if (state.status === "LIVE" || state.status === "STALE") state.status = "DISCONNECTED"; } this.emit({ type: "CONNECTION_LOST", payload: {} }); }
      else { this.emit({ type: "CONNECTION_RESTORED", payload: {} }); void this.restoreAfterReconnect(); }
      if (reason === "stopped") this.engineStatus = "STOPPED";
    });
  }

  private async restoreAfterReconnect() {
    try {
      await this.syncServerTime();
      for (const state of this.states.values()) await this.warmSymbol(state.metadata);
      this.evaluateEngineStatus();
    } catch (error) { dataLogger.warn(INDEX_SCOPE, "Reconnect recovery failed", error); }
  }

  private async syncServerTime() {
    const response = await this.provider.request({ time: 1 });
    const serverTime = asNumber(response["time"]);
    const offset = serverTime * 1000 - Date.now();
    this.serverTimeOffset = Number.isFinite(offset) && Math.abs(offset) < 60_000 ? offset : 0;
  }

  private async refreshTradingTimes() {
    try {
      const date = new Date(this.getServerTime()).toISOString().slice(0, 10);
      const response = await this.provider.request({ trading_times: date });
      const matches = (value: unknown): void => {
        if (Array.isArray(value)) { for (const item of value) matches(item); return; }
        if (!value || typeof value !== "object") return;
        const record = value as Json;
        const symbol = asText(record["underlying_symbol"]) ?? asText(record["symbol"]);
        if (symbol && this.registry.get(symbol)) {
          const open = asBool(record["exchange_is_open"], true);
          const suspended = asBool(record["is_trading_suspended"], false);
          this.registry.updateAvailability(symbol, open, suspended);
        }
        for (const child of Object.values(record)) matches(child);
      };
      matches(response["trading_times"] ?? response);
    } catch (error) { dataLogger.warn(INDEX_SCOPE, "Trading schedule unavailable; using active_symbols state", error); }
  }

  private ensureState(metadata: IndicesSymbol) {
    const state = this.states.get(metadata.symbol);
    if (state) { state.metadata = metadata; return state; }
    const created: SymbolState = { metadata, buffer: new IndicesTickBuffer(INDICES_TICK_BUFFER_SIZE), candles: new IndicesCandleEngine(metadata.symbol), latest: null, historyLoaded: false, subscribed: false, subscriptionId: null, status: "INITIALIZING", error: null, wasStale: false, contractSupported: false };
    this.states.set(metadata.symbol, created); return created;
  }

  private async validateContracts(metadata: IndicesSymbol) {
    const state = this.ensureState(metadata);
    try {
      const response = await this.provider.request({ contracts_for: metadata.symbol });
      const contractTypes = new Set<string>();
      const collect = (value: unknown): void => {
        if (Array.isArray(value)) { value.forEach(collect); return; }
        if (!value || typeof value !== "object") return;
        const record = value as Json;
        const type = asText(record["contract_type"]);
        if (type) contractTypes.add(type.toUpperCase());
        Object.values(record).forEach(collect);
      };
      collect(response);
      state.contractSupported = contractTypes.has("CALL") && contractTypes.has("PUT");
      if (!state.contractSupported) state.error = "Rise/Fall contracts are unavailable for this index.";
    } catch (error) {
      state.contractSupported = false;
      state.error = error instanceof Error ? error.message : "Contract availability could not be verified.";
    }
  }

  private async warmSymbol(metadata: IndicesSymbol) {
    const state = this.ensureState(metadata); state.status = "LOADING_HISTORY"; state.error = null;
    if (!state.contractSupported) { state.status = "ERROR"; return; }
    if (metadata.isSuspended) { state.status = "SUSPENDED"; return; }
    if (!metadata.isOpen) { state.status = "CLOSED"; return; }
    try {
      const response = await this.provider.request({ ticks_history: metadata.symbol, count: INDICES_HISTORY_TICK_COUNT, end: "latest", style: "ticks" });
      const history = parseHistory(response, metadata.symbol, metadata.pipSize);
      state.buffer.reset(history); state.candles.seed(history); state.latest = state.buffer.latest; state.historyLoaded = history.length >= metadata.dataRequirements.minTicks;
      if (!state.historyLoaded) throw new Error("Insufficient historical ticks");
      await this.subscribe(metadata.symbol);
    } catch (error) { state.status = "ERROR"; state.error = error instanceof Error ? error.message : String(error); dataLogger.warn(INDEX_SCOPE, `Unable to warm ${metadata.symbol}`, error); }
  }

  private async subscribe(symbol: string) {
    const state = this.states.get(symbol); if (!state || state.subscribed || this.subscriptions.has(symbol)) return;
    state.subscribed = true;
    try {
      const first = await this.provider.request({ ticks: symbol, subscribe: 1 });
      const subscription = first["subscription"] as Json | undefined;
      state.subscriptionId = asText(subscription?.["id"]);
      this.subscriptions.track(symbol, state.subscriptionId);
      const tick = parseTick(first, state.metadata); if (tick) this.acceptTick(tick);
    } catch (error) { state.subscribed = false; state.status = "ERROR"; state.error = error instanceof Error ? error.message : String(error); }
  }

  private handleMessage(message: Json) {
    const rawTick = message["tick"] as Json | undefined;
    if (!rawTick) return;
    const symbol = asText(rawTick["symbol"]); const state = symbol ? this.states.get(symbol) : undefined;
    if (!state) return;
    const subscription = message["subscription"] as Json | undefined;
    if (subscription?.["id"]) { state.subscriptionId = asText(subscription["id"]); this.subscriptions.track(symbol, state.subscriptionId); }
    const tick = parseTick(message, state.metadata); if (tick) this.acceptTick(tick);
  }

  private acceptTick(tick: IndicesTick) {
    const state = this.states.get(tick.symbol); if (!state || !state.buffer.append(tick)) return;
    const wasReady = state.status === "LIVE"; state.latest = tick; state.status = "LIVE"; state.error = null;
    const events = state.candles.add(tick); this.emit({ type: "TICK_RECEIVED", payload: tick });
    for (const candle of events.opened) this.emit({ type: "CANDLE_OPENED", payload: candle });
    for (const candle of events.updated) this.emit({ type: "CANDLE_UPDATED", payload: candle });
    for (const candle of events.closed) this.emit({ type: "CANDLE_CLOSED", payload: candle });
    if (!wasReady) this.emit({ type: "INDEX_READY", payload: this.getMarketSnapshot(tick.symbol)! });
  }

  private startHealthMonitor() { if (!this.healthTimer) this.healthTimer = setInterval(() => this.refreshHealth(), INDICES_HEALTH_INTERVAL_MS); }
  private stopHealthMonitor() { if (this.healthTimer) clearInterval(this.healthTimer); this.healthTimer = null; }
  private refreshHealth() {
    for (const state of this.states.values()) {
      if (!state.latest || !state.historyLoaded) continue;
      const age = this.getServerTime() - state.latest.epoch * 1000;
      if (age > INDICES_STALE_THRESHOLD_MS && state.status === "LIVE") { state.status = "STALE"; state.wasStale = true; this.emit({ type: "DATA_STALE", payload: { symbol: state.metadata.symbol } }); }
      else if (age <= INDICES_STALE_THRESHOLD_MS && state.wasStale) { state.status = "LIVE"; state.wasStale = false; this.emit({ type: "DATA_RECOVERED", payload: { symbol: state.metadata.symbol } }); }
    }
    this.evaluateEngineStatus();
  }
  private evaluateEngineStatus() {
    const states = [...this.states.values()];
    const ready = states.filter((state) => state.status === "LIVE" && state.historyLoaded && state.subscribed && state.contractSupported).length;
    if (!this.running) this.engineStatus = "STOPPED";
    else if (states.length > 0 && ready === states.length) { this.engineStatus = "READY"; this.message = "All configured indices are receiving live ticks."; }
    else if (ready > 0) { this.engineStatus = "PARTIALLY_READY"; this.message = `${ready} of ${states.length} configured indices are live.`; }
    else { this.engineStatus = "WAITING_FOR_DATA"; this.message = "Waiting for valid live market data."; }
  }

  getAvailableIndices() { return this.registry.list(); }
  getEnabledIndices() { return this.registry.enabled(); }
  getIndexMetadata(symbol: string) { return this.registry.get(symbol); }
  getLatestTick(symbol: string) { return this.states.get(symbol)?.latest ? { ...this.states.get(symbol)!.latest! } : null; }
  getTickHistory(symbol: string, count?: number) { return this.states.get(symbol)?.buffer.toArray(count) ?? []; }
  getCandles(symbol: string, timeframe: IndicesTimeframe) { return this.states.get(symbol)?.candles.get(timeframe) ?? []; }
  getLatestCandle(symbol: string, timeframe: IndicesTimeframe) { return this.getCandles(symbol, timeframe).at(-1) ?? null; }
  getMarketState(symbol: string) { const snapshot = this.getMarketSnapshot(symbol); return snapshot?.marketState ?? null; }
  getDataHealth(symbol: string): IndicesDataHealth | null { const state = this.states.get(symbol); if (!state) return null; const age = state.latest ? Math.max(0, this.getServerTime() - state.latest.epoch * 1000) : null; return { state: state.status, quality: this.quality(state, age), dataAge: age, latencyMs: state.latest ? Math.max(0, state.latest.receivedAt - (state.latest.epoch * 1000 + this.serverTimeOffset)) : null, historyLoaded: state.historyLoaded, subscribed: state.subscribed, subscriptionId: state.subscriptionId, error: state.error }; }
  isDataReady(symbol: string) { const state = this.states.get(symbol); const health = this.getDataHealth(symbol); return Boolean(state?.contractSupported && health?.state === "LIVE" && health.historyLoaded && health.subscribed); }

  getMarketSnapshot(symbol: string): IndicesMarketSnapshot | null {
    const state = this.states.get(symbol); if (!state) return null;
    const marketState: IndicesMarketState = { symbol, price: state.latest?.price ?? null, lastTick: state.latest ? { ...state.latest } : null, tickCount: state.buffer.size, dataAge: state.latest ? Math.max(0, this.getServerTime() - state.latest.epoch * 1000) : null, lastTickTime: state.latest?.epoch ?? null, lastTickReceived: state.latest?.receivedAt ?? null, connectionState: state.status, marketState: state.metadata.isSuspended ? "SUSPENDED" : state.metadata.isOpen ? "AVAILABLE" : "CLOSED", candles: Object.fromEntries(INDICES_TIMEFRAMES.map((timeframe) => [timeframe, state.candles.get(timeframe)])), volatilityData: this.metrics(state), ready: this.isDataReady(symbol) };
    return Object.freeze({ symbol, timestamp: this.getServerTime(), price: state.latest?.price ?? null, tick: state.latest ? { ...state.latest } : null, recentTicks: Object.freeze(state.buffer.toArray(500)), candles: Object.freeze(marketState.candles), metadata: state.metadata, marketState, dataHealth: this.getDataHealth(symbol)! });
  }

  getSnapshot(): IndicesEngineSnapshot { const symbols = Object.fromEntries([...this.states.keys()].map((symbol) => [symbol, this.getMarketSnapshot(symbol)!])); const readyCount = Object.values(symbols).filter((snapshot) => snapshot.marketState.ready).length; return { status: this.engineStatus, running: this.running, serverTimeOffset: Math.abs(this.serverTimeOffset) > 60_000 ? 0 : this.serverTimeOffset, configuredCount: this.registry.enabled().length, readyCount, message: this.message, symbols }; }

  private metrics(state: SymbolState) {
    const ticks = state.buffer.toArray(500); const prices = ticks.map((tick) => tick.price); const changes = prices.slice(1).map((price, index) => price - prices[index]!); const last = state.latest; const first = ticks[0]; const seconds = last && first ? Math.max(1, last.epoch - first.epoch) : 0; const standardDeviation = prices.length ? Math.sqrt(prices.reduce((sum, price) => sum + (price - prices.reduce((a, b) => a + b, 0) / prices.length) ** 2, 0) / prices.length) : null;
    return { tickHigh: Object.fromEntries([50, 100, 200, 500].map((window) => [window, this.range(ticks.slice(-window), "high")])), tickLow: Object.fromEntries([50, 100, 200, 500].map((window) => [window, this.range(ticks.slice(-window), "low")])), tickRange: Object.fromEntries([50, 100, 200, 500].map((window) => { const values = ticks.slice(-window).map((tick) => tick.price); return [window, values.length ? Math.max(...values) - Math.min(...values) : null]; })), standardDeviation, averageTickChange: changes.length ? changes.reduce((a, b) => a + Math.abs(b), 0) / changes.length : null, ticksPerSecond: seconds ? ticks.length / seconds : null, priceChangePerTick: changes.at(-1) ?? null, priceChangePerSecond: seconds && first && last ? (last.price - first.price) / seconds : null, acceleration: changes.length > 1 ? changes.at(-1)! - changes.at(-2)! : null };
  }
  private range(ticks: IndicesTick[], edge: "high" | "low") { if (!ticks.length) return null; return edge === "high" ? Math.max(...ticks.map((tick) => tick.price)) : Math.min(...ticks.map((tick) => tick.price)); }
  private quality(state: SymbolState, age: number | null): DataQuality { if (!state.historyLoaded || !state.subscribed || state.status === "ERROR") return "BAD"; if (age === null || age > INDICES_STALE_THRESHOLD_MS) return "DEGRADED"; return state.buffer.size >= 500 ? "EXCELLENT" : "GOOD"; }
  private emit(event: IndicesDataEvent) { for (const listener of this.listeners) { try { listener(event); } catch (error) { dataLogger.warn(INDEX_SCOPE, "Event listener failed", error); } } }
}

export const indicesDataEngine = new IndicesDataEngine();
