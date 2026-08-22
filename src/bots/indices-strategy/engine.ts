import type { IndicesDataEngine, IndicesMarketSnapshot } from "@/bots/indices-data";
import { configForSymbol, INDICES_STRATEGY_CONFIG, type IndicesStrategyConfig, type StrategyDirection, type StrategyMode } from "./config";
import { EntryTimingEngine, MarketRegimeDetector, MicroStructureEngine, MomentumEngine, MultiTimeframeEngine, PullbackEngine, SignalScoringEngine, StrategySafetyGate, StructureEngine, TrendEngine, VolatilityEngine } from "./modules";
import type { StrategyDecision, StrategyEvent, StrategySignal } from "./types";

type SignalListener = (event: StrategyEvent) => void;

export class StrategyDecisionEngine {
  constructor(private readonly config: IndicesStrategyConfig = INDICES_STRATEGY_CONFIG) {}
  evaluate(snapshot: IndicesMarketSnapshot, mode: StrategyMode = "LIVE"): StrategyDecision {
    const now = snapshot.timestamp; const candles = snapshot.candles[60]?.filter((c) => c.isClosed) ?? [];
    const insufficient = !snapshot.marketState.ready || snapshot.dataHealth.dataAge === null || snapshot.dataHealth.dataAge > 10_000 || candles.length < 20;
    if (insufficient) return this.wait(snapshot, "DATA_NOT_READY", now, "NO_TRADE");
    const trendEngine = new TrendEngine(); const volatilityEngine = new VolatilityEngine(); const momentumEngine = new MomentumEngine(); const structureEngine = new StructureEngine();
    const trend15 = trendEngine.analyze(snapshot.candles[900] ?? []); const trend5 = trendEngine.analyze(snapshot.candles[300] ?? []); const trend1 = trendEngine.analyze(candles); const volatility = volatilityEngine.analyze(candles, snapshot); const momentum = momentumEngine.analyze(candles, [...snapshot.recentTicks]); const structure = structureEngine.analyze(candles);
    const regime = new MarketRegimeDetector().detect(trend15, volatility); const pullback = new PullbackEngine().analyze(candles, trend1, structure); const micro = new MicroStructureEngine().analyze([...snapshot.recentTicks]); const timing = new EntryTimingEngine().analyze(momentum, micro, trend1.direction); const multi = new MultiTimeframeEngine().analyze(trend15.direction, trend5.direction, trend1.direction, micro.direction);
    const direction = multi.direction as StrategyDirection | "NEUTRAL";
    const confidence = new SignalScoringEngine().score({ trend: trend1.strength, momentum: momentum.score, structure: structure.score, volatility: volatility.score, pullback: pullback.quality, microstructure: micro.score, entryTiming: timing.score, multiTimeframe: multi.agreement * 100, marketQuality: snapshot.dataHealth.quality === "EXCELLENT" ? 100 : 70 }, this.config);
    if (multi.conflict) return this.wait(snapshot, "TIMEFRAME_CONFLICT", now, "WAIT", confidence);
    if (regime === "RANGING" || regime === "HIGH_VOLATILITY" || volatility.regime === "EXTREME") return this.wait(snapshot, volatility.regime === "EXTREME" ? "EXTREME_VOLATILITY" : "MARKET_FILTER", now, "NO_TRADE", confidence);
    if (direction === "NEUTRAL" || mode === "BACKTEST" && snapshot.tick === null) return this.wait(snapshot, "NO_CONFIRMED_DIRECTION", now, "WAIT", confidence);
    const approved = new StrategySafetyGate(this.config).approve({ snapshot, direction, confidence, setup: pullback, timing, trend: trend1, volatility, multi });
    if (!approved) return this.wait(snapshot, pullback.valid ? "CONFIRMATION_REQUIRED" : "NO_VALID_PULLBACK", now, "WAIT", confidence);
    return { decision: direction, confidence, symbol: snapshot.symbol, entryReady: true, reasonCode: `${direction}_PULLBACK_CONTINUATION`, timestamp: now, validityWindow: configForSymbol(snapshot.symbol, this.config).signalLifetimeMs, strategyVersion: this.config.version, status: "ENTRY_READY" };
  }
  private wait(snapshot: IndicesMarketSnapshot, reasonCode: string, timestamp: number, decision: "WAIT" | "NO_TRADE", confidence = 0): StrategyDecision { return { decision, confidence, symbol: snapshot.symbol, entryReady: false, reasonCode, timestamp, validityWindow: 0, strategyVersion: this.config.version, status: decision }; }
}

export class TradeOpportunityManager {
  private pending = new Map<string, StrategySignal>(); private cooldownUntil = new Map<string, number>();
  constructor(private readonly config: IndicesStrategyConfig = INDICES_STRATEGY_CONFIG) {}
  create(decision: StrategyDecision, snapshot: IndicesMarketSnapshot): StrategySignal | null {
    if (!decision.entryReady || decision.decision === "NO_TRADE" || decision.decision === "WAIT" || this.cooldownUntil.get(decision.symbol)! > decision.timestamp) return null;
    const setupId = `${decision.symbol}:${decision.reasonCode}:${Math.floor(decision.timestamp / 60_000)}`; if (this.pending.has(decision.symbol)) return null;
    const symbolConfig = configForSymbol(decision.symbol, this.config); const signal: StrategySignal = { signalId: `${setupId}:${decision.timestamp}`, setupId, symbol: decision.symbol, direction: decision.decision, confidence: decision.confidence, strategyVersion: decision.strategyVersion, entryReferencePrice: snapshot.price!, generatedAt: decision.timestamp, expiresAt: decision.timestamp + symbolConfig.signalLifetimeMs, timeframeContext: { regime: decision.decision, trend: decision.decision, setup: decision.decision, tick: decision.decision }, marketRegime: "STRONG_UPTREND", trendDirection: decision.decision, setupType: "TREND_PULLBACK_CONTINUATION", validity: { maxTicks: 10, maxEntryDriftAtr: symbolConfig.maxEntryDriftAtr }, status: "ENTRY_READY" };
    this.pending.set(decision.symbol, signal); return signal;
  }
  validate(signal: StrategySignal, snapshot: IndicesMarketSnapshot, now = Date.now()) {
    if (signal.status !== "ENTRY_READY" || now > signal.expiresAt || !snapshot.marketState.ready || snapshot.dataHealth.dataAge === null || snapshot.dataHealth.dataAge > 10_000 || snapshot.price === null) { signal.status = now > signal.expiresAt ? "EXPIRED" : "INVALIDATED"; this.pending.delete(signal.symbol); return false; }
    return true;
  }
  consume(symbol: string) { const signal = this.pending.get(symbol); if (!signal) return null; signal.status = "CONSUMED"; this.pending.delete(symbol); this.cooldownUntil.set(symbol, Date.now() + configForSymbol(symbol, this.config).cooldownMs); return signal; }
  invalidateAll() { for (const signal of this.pending.values()) signal.status = "INVALIDATED"; this.pending.clear(); }
  get(symbol: string) { return this.pending.get(symbol) ?? null; }
}

export class IndicesOpportunityScanner {
  private readonly decisionEngine: StrategyDecisionEngine; private readonly opportunities = new Map<string, StrategySignal>(); private readonly listeners = new Set<SignalListener>(); private running = false;
  constructor(private readonly dataEngine: IndicesDataEngine, private readonly config = INDICES_STRATEGY_CONFIG, private readonly opportunityManager = new TradeOpportunityManager(config)) { this.decisionEngine = new StrategyDecisionEngine(config); }
  onEvent(listener: SignalListener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  start() { if (this.running) return; this.running = true; return this.dataEngine.onEvent((event) => { if (event.type === "CANDLE_CLOSED" || event.type === "TICK_RECEIVED") this.scan(event.payload.symbol); }); }
  stop() { this.running = false; this.opportunityManager.invalidateAll(); this.opportunities.clear(); }
  scan(symbol: string): StrategyDecision | null { if (!this.running) return null; const snapshot = this.dataEngine.getMarketSnapshot(symbol); if (!snapshot) return null; const decision = this.decisionEngine.evaluate(snapshot); const signal = this.opportunityManager.create(decision, snapshot); if (signal) { this.opportunities.set(symbol, signal); this.emit({ type: "SIGNAL_CREATED", payload: signal }); this.emit({ type: "SIGNAL_CONFIRMED", payload: signal }); this.emit({ type: "SIGNAL_READY", payload: signal }); } return decision; }
  getBestOpportunities() { return [...this.opportunities.values()].sort((a, b) => b.confidence - a.confidence); }
  expire(now = Date.now()) { for (const [symbol, signal] of this.opportunities) { const snapshot = this.dataEngine.getMarketSnapshot(symbol); if (!snapshot || !this.opportunityManager.validate(signal, snapshot, now)) { this.opportunities.delete(symbol); this.emit({ type: signal.status === "EXPIRED" ? "SIGNAL_EXPIRED" : "SIGNAL_INVALIDATED", payload: signal }); } } }
  private emit(event: StrategyEvent) { for (const listener of this.listeners) listener(event); }
}

export class IndicesStrategyEngine {
  readonly scanner: IndicesOpportunityScanner; private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly dataEngine: IndicesDataEngine, config = INDICES_STRATEGY_CONFIG) { this.scanner = new IndicesOpportunityScanner(dataEngine, config); }
  start() { const remove = this.scanner.start(); this.timer = setInterval(() => this.scanner.expire(), 1_000); return remove; }
  stop() { this.scanner.stop(); if (this.timer) clearInterval(this.timer); this.timer = null; }
}
