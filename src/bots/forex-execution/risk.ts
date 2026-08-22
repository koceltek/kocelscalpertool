import type { BotSettings } from "@/bots/settings";
import type { ForexTrade, ProtectionState } from "./types";

const STORAGE_KEY = "kocel:forex:risk:v1";
type RiskState = {
  dailyRealizedPnL: number;
  consecutiveLosses: number;
  protection: ProtectionState;
  day: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}
function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export class ForexRiskEngine {
  private stateValue: RiskState = {
    dailyRealizedPnL: 0,
    consecutiveLosses: 0,
    protection: "NORMAL",
    day: today(),
  };
  constructor(private readonly settings: BotSettings) {
    this.restore();
  }
  get state() {
    this.resetDayIfNeeded();
    return { ...this.stateValue };
  }

  approve(
    balance: number | null,
    activeTrade: ForexTrade | null,
    running: boolean,
    now = Date.now(),
  ) {
    this.resetDayIfNeeded();
    if (!running) return { approved: false, stake: 0, reason: "BOT_STOPPED" };
    if (activeTrade) return { approved: false, stake: 0, reason: "ACTIVE_TRADE_EXISTS" };
    if (this.settings.capitalProtection && this.stateValue.protection === "PROTECTION_STOP")
      return { approved: false, stake: 0, reason: "PROTECTION_STOP" };
    if (this.cooldownUntil > now) return { approved: false, stake: 0, reason: "COOLDOWN" };
    if (!finite(this.settings.stake) || this.settings.stake <= 0)
      return { approved: false, stake: 0, reason: "INVALID_STAKE" };
    if (!finite(balance) || balance < this.settings.stake)
      return { approved: false, stake: 0, reason: "INSUFFICIENT_BALANCE" };
    return { approved: true, stake: this.settings.stake, reason: "RISK_APPROVED" };
  }

  recordResult(profit: number, result: "WIN" | "LOSS") {
    if (!finite(profit)) return;
    this.resetDayIfNeeded();
    this.stateValue.dailyRealizedPnL += profit;
    this.stateValue.consecutiveLosses =
      result === "LOSS" ? this.stateValue.consecutiveLosses + 1 : 0;
    if (
      this.settings.capitalProtection &&
      (this.stateValue.consecutiveLosses >= this.settings.maxConsecutiveLosses ||
        this.stateValue.dailyRealizedPnL <= -this.settings.dailyLossLimit)
    ) {
      this.stateValue.protection = "PROTECTION_STOP";
    } else if (
      this.settings.capitalProtection &&
      (this.stateValue.consecutiveLosses > 0 || this.stateValue.dailyRealizedPnL < 0)
    ) {
      this.stateValue.protection = "WARNING";
    }
    this.cooldownUntil = Date.now() + this.settings.cooldownSeconds * 1000;
    this.persist();
  }

  private cooldownUntil = 0;
  private resetDayIfNeeded() {
    if (this.stateValue.day === today()) return;
    this.stateValue = {
      dailyRealizedPnL: 0,
      consecutiveLosses: 0,
      protection: "NORMAL",
      day: today(),
    };
    this.persist();
  }
  private restore() {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(STORAGE_KEY) ?? "null",
      ) as Partial<RiskState> | null;
      if (
        saved?.day === today() &&
        finite(saved.dailyRealizedPnL) &&
        finite(saved.consecutiveLosses)
      )
        this.stateValue = {
          dailyRealizedPnL: saved.dailyRealizedPnL,
          consecutiveLosses: saved.consecutiveLosses,
          protection: saved.protection ?? "NORMAL",
          day: saved.day,
        };
    } catch {
      /* use clean state */
    }
  }
  private persist() {
    if (typeof window !== "undefined")
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stateValue));
  }
}
