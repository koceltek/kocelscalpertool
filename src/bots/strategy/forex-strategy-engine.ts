import { forexMarketDataService } from "@/bots/data/forex-data-service";
import { SUPPORTED_FOREX_PAIRS, type ForexPairId } from "@/bots/data/config";
import { evaluateForexSetup } from "./evaluate";
import { FOREX_STRATEGY_CONFIG } from "./config";
import type {
  MarketSnapshotInput,
  StrategyEvent,
  StrategyHealth,
  StrategySignal,
  StrategySnapshot,
} from "./types";

type StrategyListener = (event: StrategyEvent) => void;

/**
 * Phase 3A lifecycle controller. It evaluates live data and exposes approved
 * setups; execution belongs to a later phase and is deliberately absent here.
 */
export class ForexStrategyEngine {
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private releaseData: (() => void) | null = null;
  private removeSnapshots: (() => void) | null = null;
  private listeners = new Set<StrategyListener>();
  private snapshots = new Map<string, StrategySnapshot>();
  private setups = new Map<string, StrategySignal>();
  private latestSignal: StrategySignal | null = null;
  private lockedSignalId: string | null = null;
  private cooldownUntil = 0;
  private message = "Strategy stopped.";
  private lastEvaluation: number | null = null;

  start(selectedMarkets: string[] = SUPPORTED_FOREX_PAIRS.map((pair) => pair.id)): () => void {
    if (this.running) return () => this.stop();
    this.running = true;
    this.message = "Warming up market data...";
    this.releaseData = forexMarketDataService.acquire();
    const marketIds = selectedMarkets
      .map(
        (selected) =>
          SUPPORTED_FOREX_PAIRS.find(
            (pair) => pair.id === selected || pair.expectedSymbol === selected,
          )?.id,
      )
      .filter((id): id is ForexPairId => Boolean(id));
    this.removeSnapshots = forexMarketDataService.onSnapshot(() => this.evaluate(marketIds));
    void forexMarketDataService.initialize().then(() => this.evaluate(marketIds));
    this.timer = setInterval(
      () => this.evaluate(marketIds),
      FOREX_STRATEGY_CONFIG.evaluationIntervalMs,
    );
    return () => this.stop();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.removeSnapshots?.();
    this.removeSnapshots = null;
    this.releaseData?.();
    this.releaseData = null;
    this.invalidateSignal();
    this.message = "Strategy stopped.";
  }

  onEvent(listener: StrategyListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getLatestSignal(): StrategySignal | null {
    return this.latestSignal ? { ...this.latestSignal } : null;
  }

  getBestSetup(): StrategySignal | null {
    const candidates = [...this.setups.values()].filter((setup) => this.validateSignal(setup));
    candidates.sort((left, right) => right.score - left.score || right.createdAt - left.createdAt);
    return candidates[0] ? { ...candidates[0] } : null;
  }

  getStrategySnapshot(symbol?: string): StrategySnapshot | Record<string, StrategySnapshot> | null {
    if (symbol) return this.snapshots.get(symbol) ?? null;
    return Object.fromEntries([...this.snapshots].map(([key, value]) => [key, { ...value }]));
  }

  getHealth(): StrategyHealth {
    const data = forexMarketDataService.getSnapshot();
    const status = !this.running
      ? "STOPPED"
      : data.engineStatus === "ERROR"
        ? "ERROR"
        : this.latestSignal && this.validateSignal(this.latestSignal)
          ? "SIGNAL_READY"
          : this.lastEvaluation === null || !data.dataReady
            ? "WARMING_UP"
            : "SCANNING";
    return {
      status,
      strategyReady: this.running && data.dataReady,
      dataReady: data.dataReady,
      lastEvaluation: this.lastEvaluation,
      lastSignal: this.getLatestSignal(),
      activeSetup: this.getBestSetup(),
      message: this.message,
    };
  }

  validateSignal(signal: StrategySignal | null, now = Date.now()): boolean {
    if (!signal || !signal.setupId || signal.status !== "READY" || !signal.valid) return false;
    if (signal.expiresAt < now || this.cooldownUntil > now) return false;
    if (this.lockedSignalId && this.lockedSignalId !== signal.setupId) return false;
    const market = forexMarketDataService.getMarketState(signal.symbol as ForexPairId);
    if (!market?.ready || market.latestPrice === null || signal.triggerPrice === null) return false;
    const atrDrift = Math.max(market.latestPrice * 0.0005, 0.00001);
    return Math.abs(market.latestPrice - signal.triggerPrice) <= atrDrift;
  }

  lockSignal(setupId: string): boolean {
    const signal = this.setups.get(setupId);
    if (!this.validateSignal(signal ?? null)) return false;
    this.lockedSignalId = setupId;
    this.setups.set(setupId, { ...signal, status: "LOCKED" });
    return true;
  }

  unlockSignal(): void {
    this.lockedSignalId = null;
  }

  private evaluate(selectedMarkets: string[]) {
    if (!this.running) return;
    const now = Date.now();
    for (const pair of SUPPORTED_FOREX_PAIRS) {
      if (!selectedMarkets.includes(pair.id)) continue;
      const market = forexMarketDataService.getMarketState(pair.id);
      if (!market) continue;
      const input: MarketSnapshotInput = {
        id: pair.id,
        symbol: market.symbol ?? pair.expectedSymbol,
        displayName: pair.displayName,
        timestamp: now,
        price: market.latestPrice,
        pipSize: pair.id === "USDJPY" ? 0.01 : 0.0001,
        dataReady: market.ready,
        dataAgeMs: market.dataAgeMs,
        marketOpen: market.availability === "AVAILABLE",
        currentSpread: market.currentSpread,
        baselineSpread: market.averageSpread,
        candles: {
          60: forexMarketDataService.getCandles(pair.id, 60),
          300: forexMarketDataService.getCandles(pair.id, 300),
          900: forexMarketDataService.getCandles(pair.id, 900),
        },
      };
      const snapshot = evaluateForexSetup(input);
      this.snapshots.set(pair.id, snapshot);
      this.emit({ type: "STRATEGY_ANALYZING", symbol: pair.id, timestamp: now, snapshot });
      if (
        snapshot.decision === "SIGNAL_READY" &&
        snapshot.direction &&
        snapshot.entryContext.triggerPrice !== null
      ) {
        const setupId = `${pair.id}:${snapshot.entryContext.structureId}:${snapshot.direction}`;
        const existing = this.setups.get(setupId);
        const signal: StrategySignal = {
          setupId,
          symbol: pair.id,
          displayName: pair.displayName,
          decision: snapshot.direction,
          status: existing?.status === "LOCKED" ? "LOCKED" : "READY",
          score: snapshot.score,
          triggerPrice: snapshot.entryContext.triggerPrice,
          suggestedDurationSeconds: FOREX_STRATEGY_CONFIG.suggestedDurationSeconds,
          createdAt: existing?.createdAt ?? now,
          expiresAt: existing?.expiresAt ?? now + FOREX_STRATEGY_CONFIG.maxSignalAgeSeconds * 1000,
          valid: true,
          reasons: [...snapshot.reasons],
        };
        this.setups.set(setupId, signal);
        this.latestSignal = signal;
        this.message = "Valid Forex setup ready.";
        this.emit({ type: "SIGNAL_READY", symbol: pair.id, timestamp: now, signal, snapshot });
      } else {
        const current = this.setups.get(
          `${pair.id}:${snapshot.entryContext.structureId}:${snapshot.direction}`,
        );
        if (current && current.status === "READY") {
          this.setups.set(current.setupId, { ...current, status: "INVALIDATED", valid: false });
          this.emit({
            type: "SIGNAL_INVALIDATED",
            symbol: pair.id,
            timestamp: now,
            signal: current,
            snapshot,
          });
        }
      }
    }
    for (const [id, signal] of this.setups) {
      if (signal.expiresAt < now && signal.status === "READY")
        this.setups.set(id, { ...signal, status: "EXPIRED", valid: false });
    }
    this.lastEvaluation = now;
  }

  invalidateSignal() {
    const timestamp = Date.now();
    for (const [setupId, signal] of this.setups) {
      if (signal.status !== "READY") continue;
      const invalidated = { ...signal, status: "INVALIDATED" as const, valid: false };
      this.setups.set(setupId, invalidated);
      this.emit({
        type: "SIGNAL_INVALIDATED",
        symbol: invalidated.symbol,
        timestamp,
        signal: invalidated,
      });
    }
    if (this.latestSignal?.status === "READY") {
      this.latestSignal = { ...this.latestSignal, status: "INVALIDATED", valid: false };
    }
  }

  private emit(event: StrategyEvent) {
    for (const listener of this.listeners) listener(event);
  }
}

export const forexStrategyEngine = new ForexStrategyEngine();
