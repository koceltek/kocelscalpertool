import type { StrategySignal } from "@/bots/indices-strategy";

export type TradeState = "PENDING" | "PROPOSAL_REQUESTED" | "PROPOSAL_READY" | "BUYING" | "OPEN" | "MONITORING" | "EXIT_REQUESTED" | "SELLING" | "WON" | "LOST" | "EXPIRED" | "CANCELLED" | "FAILED";
export type ProtectionState = "NORMAL" | "WARNING" | "PROTECTION_STOP";

export type RiskSettings = { stake: number; maxLossPerTrade: number; maxConsecutiveLosses: number; dailyLossLimit: number; capitalProtection: boolean; cooldownSeconds: number; targetProfit?: number };
export type RiskDecision = { approved: boolean; stake: number; reason: string };

export type IndicesTrade = {
  tradeId: string; contractId: string; symbol: string; direction: "RISE" | "FALL"; stake: number; buyPrice: number; exitPrice: number | null; profit: number | null; result: "WIN" | "LOSS" | "OPEN"; openedAt: number; closedAt: number | null; strategyVersion: string; signalId: string; setupType: string; confidence: number; status: TradeState; currentValue: number | null; currentProfit: number | null;
};

export type TradingRequest = (operation: "contracts_for" | "proposal" | "buy" | "portfolio" | "proposal_open_contract" | "sell", payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
export type ExecutionStatus = { botRunning: boolean; protection: ProtectionState; message: string; activeTrade: IndicesTrade | null; dailyRealizedPnL: number; consecutiveLosses: number };
export type ExecutionEvent = { type: "SIGNAL_RECEIVED" | "RISK_APPROVED" | "PROPOSAL_REQUESTED" | "PROPOSAL_RECEIVED" | "BUY_REQUESTED" | "BUY_CONFIRMED" | "CONTRACT_OPENED" | "EXIT_TRIGGERED" | "SELL_REQUESTED" | "SELL_CONFIRMED" | "CONTRACT_CLOSED" | "TRADE_RECORDED"; trade?: IndicesTrade; signal?: StrategySignal };
