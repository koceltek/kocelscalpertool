import type { IndicesTrade, ProtectionState, RiskDecision, RiskSettings } from "./types";

const STORAGE_KEY = "kocel:indices:risk:v1";
type PersistedRiskState = { consecutiveLosses: number; dailyRealizedPnL: number; protection: ProtectionState; day: string };

function today() { return new Date().toISOString().slice(0, 10); }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }

export class IndicesRiskEngine {
  private stateValue: PersistedRiskState = { consecutiveLosses: 0, dailyRealizedPnL: 0, protection: "NORMAL", day: today() };
  private cooldownUntil = 0;
  constructor(private readonly settings: RiskSettings) { this.restore(); }
  get state() { this.resetDayIfNeeded(); return { ...this.stateValue }; }
  validateStake(): RiskDecision { return this.settings.stake > 0 && Number.isFinite(this.settings.stake) ? { approved: true, stake: this.settings.stake, reason: "RISK_LIMITS_OK" } : { approved: false, stake: 0, reason: "INVALID_STAKE" }; }
  checkBalance(balance: number | null): RiskDecision { const stake = this.validateStake(); return !stake.approved ? stake : balance !== null && balance >= stake.stake ? stake : { approved: false, stake: 0, reason: "INSUFFICIENT_BALANCE" }; }
  approve(balance: number | null, activeTrade: IndicesTrade | null, running: boolean, now = Date.now()): RiskDecision {
    const stake = this.checkBalance(balance); if (!stake.approved) return stake;
    if (!running) return { approved: false, stake: 0, reason: "BOT_STOPPED" };
    if (activeTrade) return { approved: false, stake: 0, reason: "ACTIVE_TRADE_EXISTS" };
    if (this.stateValue.protection === "PROTECTION_STOP") return { approved: false, stake: 0, reason: "PROTECTION_STOP" };
    if (this.cooldownUntil > now) return { approved: false, stake: 0, reason: "COOLDOWN" };
    return stake;
  }
  recordResult(profit: number, result: "WIN" | "LOSS") {
    if (!finite(profit)) return;
    this.resetDayIfNeeded();
    this.stateValue.dailyRealizedPnL += profit;
    this.stateValue.consecutiveLosses = result === "LOSS" ? this.stateValue.consecutiveLosses + 1 : 0;
    if (this.settings.capitalProtection && (this.stateValue.consecutiveLosses >= this.settings.maxConsecutiveLosses || this.stateValue.dailyRealizedPnL <= -this.settings.dailyLossLimit)) this.stateValue.protection = "PROTECTION_STOP";
    else if (this.settings.capitalProtection && (this.stateValue.consecutiveLosses > 0 || this.stateValue.dailyRealizedPnL < 0)) this.stateValue.protection = "WARNING";
    this.cooldownUntil = Date.now() + this.settings.cooldownSeconds * 1000;
    this.persist();
  }
  resetTradingDay() { this.stateValue = { consecutiveLosses: 0, dailyRealizedPnL: 0, protection: "NORMAL", day: today() }; this.persist(); }
  private resetDayIfNeeded() { if (this.stateValue.day === today()) return; this.resetTradingDay(); }
  private restore() {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<PersistedRiskState> | null;
      if (saved?.day === today() && finite(saved.dailyRealizedPnL) && finite(saved.consecutiveLosses)) this.stateValue = { dailyRealizedPnL: saved.dailyRealizedPnL, consecutiveLosses: saved.consecutiveLosses, protection: saved.protection ?? "NORMAL", day: saved.day };
    } catch { /* use clean state */ }
  }
  private persist() { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stateValue)); }
}
