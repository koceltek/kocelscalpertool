import { forexMarketDataService } from "@/bots/data/forex-data-service";
import { SUPPORTED_FOREX_PAIRS } from "@/bots/data/config";
import { forexStrategyEngine } from "@/bots/strategy/forex-strategy-engine";
import { FOREX_STRATEGY_CONFIG } from "@/bots/strategy/config";
import type { StrategySignal } from "@/bots/strategy/types";
import type { BotSettings } from "@/bots/settings";
import { saveForexTrade } from "./history";
import { ForexProposalEngine, normalizeContract } from "./proposal";
import { ForexRiskEngine } from "./risk";
import type {
  ForexExecutionEvent,
  ForexExecutionStatus,
  ForexTrade,
  ForexTradingRequest,
} from "./types";

const value = (input: unknown) => {
  const parsed = typeof input === "number" ? input : Number(input);
  return Number.isFinite(parsed) ? parsed : null;
};
const record = (input: unknown) =>
  input && typeof input === "object" ? (input as Record<string, unknown>) : {};

export class ForexExecutionEngine {
  private readonly risk: ForexRiskEngine;
  private readonly proposal: ForexProposalEngine;
  private activeTrade: ForexTrade | null = null;
  private processedSignals = new Set<string>();
  private executionLock = false;
  private running = false;
  private monitorTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(event: ForexExecutionEvent) => void>();
  private message = "Stopped";

  constructor(
    private readonly request: ForexTradingRequest,
    private readonly settings: BotSettings,
  ) {
    this.risk = new ForexRiskEngine(settings);
    this.proposal = new ForexProposalEngine(request);
  }

  onEvent(listener: (event: ForexExecutionEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  start() {
    this.running = true;
    this.message = "Scanning";
    if (!this.monitorTimer) this.monitorTimer = setInterval(() => void this.monitorActive(), 1_000);
  }
  stop() {
    this.running = false;
    if (!this.activeTrade && this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    this.message = this.activeTrade ? "Monitoring open trade" : "Stopped";
  }
  getStatus(): ForexExecutionStatus {
    const state = this.risk.state;
    return {
      botRunning: this.running,
      protection: state.protection,
      message: this.message,
      activeTrade: this.activeTrade ? { ...this.activeTrade } : null,
      dailyRealizedPnL: state.dailyRealizedPnL,
      consecutiveLosses: state.consecutiveLosses,
    };
  }

  async executeSignal(signal: StrategySignal, balance: number | null, currency: string) {
    this.emit({ type: "SIGNAL_RECEIVED", signal });
    if (
      !this.running ||
      this.executionLock ||
      this.processedSignals.has(signal.setupId) ||
      !forexStrategyEngine.validateSignal(signal) ||
      !currency
    )
      return null;
    const pair = SUPPORTED_FOREX_PAIRS.find((item) => item.id === signal.symbol);
    const market = pair ? forexMarketDataService.getMarketState(pair.id) : null;
    if (!pair || !market?.ready || !market.symbol) return this.reject(signal, "MARKET_UNAVAILABLE");
    const risk = this.risk.approve(balance, this.activeTrade, this.running);
    if (!risk.approved) return this.reject(signal, risk.reason);
    if (!forexStrategyEngine.lockSignal(signal.setupId))
      return this.reject(signal, "SIGNAL_REJECTED");
    this.executionLock = true;
    this.processedSignals.add(signal.setupId);
    try {
      this.emit({ type: "RISK_APPROVED", signal });
      this.emit({ type: "PROPOSAL_REQUESTED", signal });
      const response = await this.proposal.requestProposal({
        symbol: market.symbol,
        direction: signal.decision,
        stake: risk.stake,
        currency,
        duration: signal.suggestedDurationSeconds,
        durationUnit: "s",
      });
      const checked = this.proposal.validate(response, {
        symbol: market.symbol,
        direction: signal.decision,
        stake: risk.stake,
        currency,
      });
      this.emit({ type: "PROPOSAL_RECEIVED", signal });
      this.emit({ type: "BUY_REQUESTED", signal });
      const bought = await this.request("buy", { buy: checked.id, price: checked.askPrice });
      const buy = record(bought["buy"]);
      const contractId = buy["contract_id"] === undefined ? "" : String(buy["contract_id"]);
      if (!contractId) throw new Error("BUY_FAILED");
      const now = Date.now();
      this.activeTrade = {
        tradeId: `${signal.setupId}:${contractId}`,
        contractId,
        transactionId: buy["transaction_id"] === undefined ? null : String(buy["transaction_id"]),
        proposalId: checked.id,
        signalId: signal.setupId,
        symbol: signal.symbol,
        direction: signal.decision,
        stake: risk.stake,
        buyPrice: checked.askPrice,
        exitPrice: null,
        profit: null,
        result: "OPEN",
        openedAt: now,
        closedAt: null,
        strategyVersion: "forex-scalper-phase-3a",
        setupType: "scalping-setup",
        confidence: signal.score,
        status: "OPEN",
        currentValue: checked.askPrice,
        currentProfit: 0,
      };
      saveForexTrade(this.activeTrade);
      this.emit({ type: "BUY_CONFIRMED", trade: this.activeTrade });
      this.emit({ type: "CONTRACT_OPENED", trade: this.activeTrade });
      await this.monitorActive();
      return this.activeTrade;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      this.message =
        reason === "PROPOSAL_EXPIRED" ? "Proposal expired" : "Unable to place the trade.";
      this.emit({
        type: reason === "NETWORK_ERROR" ? "BUY_RESULT_UNKNOWN" : "SIGNAL_REJECTED",
        signal,
        reason,
      });
      return null;
    } finally {
      this.executionLock = false;
      forexStrategyEngine.unlockSignal();
    }
  }

  async monitorActive() {
    if (!this.activeTrade || this.activeTrade.status === "SELLING") return;
    try {
      const response = await this.request("proposal_open_contract", {
        proposal_open_contract: 1,
        contract_id: this.activeTrade.contractId,
      });
      const contract = normalizeContract(response);
      this.activeTrade.currentProfit = contract.profit;
      this.activeTrade.currentValue = contract.currentValue;
      saveForexTrade(this.activeTrade);
      if (contract.isClosed && contract.result && contract.profit !== null)
        return this.closeTrade(contract.result, contract.profit, contract.exitSpot);
      const target = FOREX_STRATEGY_CONFIG.targetProfit;
      const maxLoss = this.settings.capitalProtection
        ? this.settings.maxLossPerTrade
        : Number.POSITIVE_INFINITY;
      if (contract.profit !== null && (contract.profit <= -maxLoss || contract.profit >= target)) {
        this.activeTrade.status = "EXIT_REQUESTED";
        this.emit({ type: "EXIT_TRIGGERED", trade: this.activeTrade });
        if (!contract.sellAvailable) {
          this.message = "Sell unavailable; monitoring";
          this.emit({ type: "SELL_UNAVAILABLE", trade: this.activeTrade });
          return;
        }
        this.activeTrade.status = "SELLING";
        this.emit({ type: "SELL_REQUESTED", trade: this.activeTrade });
        await this.request("sell", { sell: this.activeTrade.contractId, price: 0 });
        this.emit({ type: "SELL_CONFIRMED", trade: this.activeTrade });
      } else this.activeTrade.status = "MONITORING";
      saveForexTrade(this.activeTrade);
    } catch {
      this.message = "Unable to monitor the open trade.";
    }
  }

  async reconcile() {
    const response = await this.request("portfolio", { portfolio: 1 });
    const contracts = Array.isArray(response["contracts"]) ? response["contracts"] : [];
    const open = contracts.map(record).find((contract) => Boolean(contract["contract_id"]));
    if (!open) return null;
    const contractId = String(open["contract_id"]);
    if (this.activeTrade?.contractId === contractId) return this.activeTrade;
    const pair = SUPPORTED_FOREX_PAIRS.find(
      (item) => item.expectedSymbol === String(open["underlying"] ?? open["symbol"]),
    );
    if (!pair) return null;
    this.activeTrade = {
      tradeId: `recovered:${contractId}`,
      contractId,
      transactionId: null,
      proposalId: "recovered",
      signalId: "recovered",
      symbol: pair.id,
      direction: String(open["contract_type"] ?? "CALL")
        .toUpperCase()
        .includes("PUT")
        ? "FALL"
        : "RISE",
      stake: value(open["buy_price"]) ?? 0,
      buyPrice: value(open["buy_price"]) ?? 0,
      exitPrice: null,
      profit: value(open["profit"]),
      result: "OPEN",
      openedAt: (value(open["purchase_time"]) ?? Date.now() / 1000) * 1000,
      closedAt: null,
      strategyVersion: "recovered",
      setupType: "recovered",
      confidence: 0,
      status: "MONITORING",
      currentValue: value(open["bid_price"]),
      currentProfit: value(open["profit"]),
    };
    saveForexTrade(this.activeTrade);
    return this.activeTrade;
  }

  private async closeTrade(result: "WIN" | "LOSS", profit: number, exitPrice: number | null) {
    if (!this.activeTrade) return;
    this.activeTrade.result = result;
    this.activeTrade.profit = profit;
    this.activeTrade.exitPrice = exitPrice;
    this.activeTrade.closedAt = Date.now();
    this.activeTrade.status = result === "WIN" ? "WON" : "LOST";
    saveForexTrade(this.activeTrade);
    this.risk.recordResult(profit, result);
    this.message = result === "WIN" ? "Trade closed" : "Cooldown";
    this.emit({ type: "CONTRACT_CLOSED", trade: this.activeTrade });
    this.emit({ type: "TRADE_RECORDED", trade: this.activeTrade });
    this.activeTrade = null;
    if (!this.running && this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }
  private reject(signal: StrategySignal, reason: string) {
    this.emit({ type: "SIGNAL_REJECTED", signal, reason });
    return null;
  }
  private emit(event: ForexExecutionEvent) {
    for (const listener of this.listeners) listener(event);
  }
}
