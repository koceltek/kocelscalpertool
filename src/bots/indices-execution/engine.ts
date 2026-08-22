import type { IndicesMarketSnapshot } from "@/bots/indices-data";
import type { StrategySignal } from "@/bots/indices-strategy";
import { loadIndicesTrades, saveIndicesTrade } from "./history";
import { IndicesRiskEngine } from "./risk";
import type { ExecutionEvent, ExecutionStatus, IndicesTrade, RiskSettings, TradingRequest } from "./types";

const number = (value: unknown) => { const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; };
const nested = (value: unknown, key: string) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;

export class IndicesProposalEngine {
  constructor(private readonly request: TradingRequest) {}
  async contracts(symbol: string) { return this.request("contracts_for", { contracts_for: symbol, currency: "" }); }
  async proposal(input: { symbol: string; direction: "RISE" | "FALL"; stake: number; currency: string; duration: number; durationUnit: string }) {
    const contracts = await this.contracts(input.symbol);
    const available = JSON.stringify(contracts).toUpperCase();
    const requested = input.direction === "RISE" ? ["CALL", "RISE"] : ["PUT", "FALL"];
    const contractType = requested.find((type) => available.includes(type));
    if (!contractType) throw new Error("CONTRACT_UNAVAILABLE");
    return this.request("proposal", { proposal: 1, amount: input.stake, basis: "stake", contract_type: contractType, currency: input.currency, duration: input.duration, duration_unit: input.durationUnit, symbol: input.symbol });
  }
  validate(response: Record<string, unknown>, input: { symbol: string; stake: number; currency: string }) {
    const proposal = (response["proposal"] ?? {}) as Record<string, unknown>;
    const id = typeof proposal["id"] === "string" || typeof proposal["id"] === "number" ? String(proposal["id"]) : null;
    const ask = number(proposal["ask_price"] ?? proposal["display_value"]);
    const symbol = String(proposal["underlying"] ?? proposal["symbol"] ?? input.symbol);
    const currency = String(proposal["currency"] ?? input.currency);
    if (!id || symbol !== input.symbol || currency !== input.currency || ask === null || ask > input.stake * 1.01) throw new Error("INVALID_PROPOSAL");
    return { id, askPrice: ask, payout: number(proposal["payout"]), expiresAt: number(proposal["date_expiry"]) };
  }
}

export class IndicesContractMonitor {
  constructor(private readonly request: TradingRequest) {}
  async read(contractId: string) { const response = await this.request("proposal_open_contract", { proposal_open_contract: 1, contract_id: contractId }); return this.normalize(response); }
  private normalize(response: Record<string, unknown>) {
    const contract = (response["proposal_open_contract"] ?? {}) as Record<string, unknown>;
    const status = String(contract["status"] ?? "").toLowerCase(); const profit = number(contract["profit"]); const currentValue = number(contract["bid_price"] ?? contract["current_value"]);
    const isClosed = Boolean(contract["is_sold"]) || ["won", "lost", "expired", "sold"].includes(status);
    return { status, profit, currentValue, payout: number(contract["payout"]), currentSpot: number(contract["current_spot"]), exitSpot: number(contract["exit_spot"]), expiry: number(contract["expiry_time"]), isClosed, result: status === "won" ? "WIN" as const : status === "lost" || status === "expired" ? "LOSS" as const : null };
  }
}

export class IndicesExitEngine {
  constructor(private readonly request: TradingRequest) {}
  async sell(contractId: string) { return this.request("sell", { sell: contractId, price: 0 }); }
}

export class IndicesExecutionEngine {
  private readonly risk: IndicesRiskEngine; private readonly proposal: IndicesProposalEngine; private readonly monitor: IndicesContractMonitor; private readonly exit: IndicesExitEngine; private activeTrade: IndicesTrade | null = null; private processedSignals = new Set<string>(); private executionLock = false; private running = false; private monitorTimer: ReturnType<typeof setInterval> | null = null; private listeners = new Set<(event: ExecutionEvent) => void>(); private message = "Stopped";
  constructor(private readonly request: TradingRequest, private readonly riskSettings: RiskSettings) { this.risk = new IndicesRiskEngine(riskSettings); this.proposal = new IndicesProposalEngine(request); this.monitor = new IndicesContractMonitor(request); this.exit = new IndicesExitEngine(request); }
  onEvent(listener: (event: ExecutionEvent) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  start() { this.running = true; this.message = "Scanning"; if (!this.monitorTimer) this.monitorTimer = setInterval(() => void this.monitorActive(), 1_000); }
  stop() { this.running = false; if (!this.activeTrade && this.monitorTimer) { clearInterval(this.monitorTimer); this.monitorTimer = null; } this.message = this.activeTrade ? "Monitoring open trade" : "Stopped"; }
  async monitorActive() { if (this.activeTrade) await this.monitorTrade(); }
  getStatus(): ExecutionStatus { const state = this.risk.state; return { botRunning: this.running, protection: state.protection, message: this.message, activeTrade: this.activeTrade ? { ...this.activeTrade } : null, dailyRealizedPnL: state.dailyRealizedPnL, consecutiveLosses: state.consecutiveLosses }; }
  async execute(signal: StrategySignal, snapshot: IndicesMarketSnapshot, balance: number | null, currency: string) {
    this.emit({ type: "SIGNAL_RECEIVED", signal });
    if (!this.running || this.executionLock || this.processedSignals.has(signal.signalId) || signal.status !== "ENTRY_READY" || Date.now() > signal.expiresAt || snapshot.symbol !== signal.symbol || snapshot.price === null) return null;
    this.processedSignals.add(signal.signalId);
    this.executionLock = true;
    const risk = this.risk.approve(balance, this.activeTrade, this.running); if (!risk.approved) { this.message = risk.reason; return null; } this.emit({ type: "RISK_APPROVED", signal });
    try {
      this.message = "Preparing trade"; this.emit({ type: "PROPOSAL_REQUESTED", signal });
      const response = await this.proposal.proposal({ symbol: signal.symbol, direction: signal.direction, stake: risk.stake, currency, duration: 5, durationUnit: "t" });
      const checked = this.proposal.validate(response, { symbol: signal.symbol, stake: risk.stake, currency }); this.emit({ type: "PROPOSAL_RECEIVED", signal });
      this.message = "Buying"; this.emit({ type: "BUY_REQUESTED", signal });
      const bought = await this.request("buy", { buy: checked.id, price: checked.askPrice }); const buy = (bought["buy"] ?? {}) as Record<string, unknown>; const contractId = String(buy["contract_id"] ?? "");
      if (!contractId) throw new Error("BUY_FAILED");
      this.activeTrade = { tradeId: `${signal.signalId}:${contractId}`, contractId, symbol: signal.symbol, direction: signal.direction, stake: risk.stake, buyPrice: checked.askPrice, exitPrice: null, profit: null, result: "OPEN", openedAt: Date.now(), closedAt: null, strategyVersion: signal.strategyVersion, signalId: signal.signalId, setupType: signal.setupType, confidence: signal.confidence, status: "OPEN", currentValue: checked.askPrice, currentProfit: 0 };
      saveIndicesTrade(this.activeTrade); this.emit({ type: "BUY_CONFIRMED", trade: this.activeTrade }); this.emit({ type: "CONTRACT_OPENED", trade: this.activeTrade });
      await this.monitorTrade(signal); return this.activeTrade;
    } catch (error) { this.message = "Trade could not be placed."; return null; }
    finally { this.executionLock = false; }
  }
  async recover() { const response = await this.request("portfolio", { portfolio: 1 }); const contracts = Array.isArray(response["contracts"]) ? response["contracts"] : []; const open = contracts[0] as Record<string, unknown> | undefined; if (open?.["contract_id"]) this.activeTrade = { tradeId: `recovered:${open["contract_id"]}`, contractId: String(open["contract_id"]), symbol: String(open["underlying"] ?? open["symbol"]), direction: String(open["contract_type"]).toUpperCase().includes("PUT") ? "FALL" : "RISE", stake: number(open["buy_price"]) ?? 0, buyPrice: number(open["buy_price"]) ?? 0, exitPrice: null, profit: number(open["profit"]), result: "OPEN", openedAt: number(open["purchase_time"]) ? Number(open["purchase_time"]) * 1000 : Date.now(), closedAt: null, strategyVersion: "recovered", signalId: "recovered", setupType: "recovered", confidence: 0, status: "OPEN", currentValue: number(open["bid_price"]), currentProfit: number(open["profit"]) }; return this.activeTrade; }
  private async monitorTrade() { if (!this.activeTrade || this.activeTrade.status === "SELLING" || this.activeTrade.status === "EXIT_REQUESTED") return; try { const state = await this.monitor.read(this.activeTrade.contractId); this.activeTrade.currentProfit = state.profit; this.activeTrade.currentValue = state.currentValue; this.activeTrade.status = state.isClosed ? state.result === "WIN" ? "WON" : "LOST" : "MONITORING"; saveIndicesTrade(this.activeTrade); if (state.isClosed && state.result && state.profit !== null) { this.activeTrade.result = state.result; this.activeTrade.profit = state.profit; this.activeTrade.closedAt = Date.now(); this.risk.recordResult(state.profit, state.result); this.message = state.result === "WIN" ? "Closed" : "Cooldown"; this.emit({ type: "CONTRACT_CLOSED", trade: this.activeTrade }); this.emit({ type: "TRADE_RECORDED", trade: this.activeTrade }); this.activeTrade = null; if (!this.running && this.monitorTimer) { clearInterval(this.monitorTimer); this.monitorTimer = null; } return; } const targetProfit = this.riskSettings.targetProfit ?? 0.1; if (state.profit !== null && (state.profit >= targetProfit || state.profit <= -this.riskSettings.maxLossPerTrade)) { this.emit({ type: "EXIT_TRIGGERED", trade: this.activeTrade }); this.activeTrade.status = "EXIT_REQUESTED"; await this.exit.sell(this.activeTrade.contractId); this.activeTrade.status = "SELLING"; this.emit({ type: "SELL_CONFIRMED", trade: this.activeTrade }); } } catch { this.message = "Unable to monitor the open trade."; } }
  private emit(event: ExecutionEvent) { for (const listener of this.listeners) listener(event); }
}

export function historyTrades() { return loadIndicesTrades(); }
