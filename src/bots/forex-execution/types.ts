import type { StrategySignal } from "@/bots/strategy/types";

export type ForexTradeState =
  | "PENDING"
  | "PROPOSAL_REQUESTED"
  | "PROPOSAL_READY"
  | "BUYING"
  | "OPEN"
  | "MONITORING"
  | "EXIT_REQUESTED"
  | "SELLING"
  | "WON"
  | "LOST"
  | "EXPIRED"
  | "CANCELLED"
  | "FAILED";
export type ProtectionState = "NORMAL" | "WARNING" | "PROTECTION_STOP";
export type ForexResult = "WIN" | "LOSS" | "OPEN";

export type ForexTrade = {
  tradeId: string;
  contractId: string;
  transactionId: string | null;
  proposalId: string;
  signalId: string;
  symbol: string;
  direction: "RISE" | "FALL";
  stake: number;
  buyPrice: number;
  exitPrice: number | null;
  profit: number | null;
  result: ForexResult;
  openedAt: number;
  closedAt: number | null;
  strategyVersion: string;
  setupType: string;
  confidence: number;
  status: ForexTradeState;
  currentValue: number | null;
  currentProfit: number | null;
};

export type ForexTradingRequest = (
  operation: "contracts_for" | "proposal" | "buy" | "portfolio" | "proposal_open_contract" | "sell",
  payload: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export type ForexExecutionEvent = {
  type:
    | "SIGNAL_RECEIVED"
    | "SIGNAL_REJECTED"
    | "RISK_APPROVED"
    | "PROPOSAL_REQUESTED"
    | "PROPOSAL_RECEIVED"
    | "BUY_REQUESTED"
    | "BUY_CONFIRMED"
    | "CONTRACT_OPENED"
    | "EXIT_TRIGGERED"
    | "SELL_REQUESTED"
    | "SELL_CONFIRMED"
    | "SELL_UNAVAILABLE"
    | "CONTRACT_CLOSED"
    | "TRADE_RECORDED"
    | "BUY_RESULT_UNKNOWN";
  trade?: ForexTrade;
  signal?: StrategySignal;
  reason?: string;
};

export type ForexExecutionStatus = {
  botRunning: boolean;
  protection: ProtectionState;
  message: string;
  activeTrade: ForexTrade | null;
  dailyRealizedPnL: number;
  consecutiveLosses: number;
};

export type NormalizedContract = {
  status: string;
  profit: number | null;
  currentValue: number | null;
  payout: number | null;
  currentSpot: number | null;
  exitSpot: number | null;
  expiry: number | null;
  isClosed: boolean;
  sellAvailable: boolean;
  result: "WIN" | "LOSS" | null;
};
