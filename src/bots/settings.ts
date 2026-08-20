import { z } from "zod";

import type { BotType } from "./contracts";
import { FOREX_MARKETS, INDICES_MARKETS } from "./markets";

export const TRADING_MODES = ["conservative", "normal", "aggressive"] as const;
export type TradingMode = (typeof TRADING_MODES)[number];

export const botSettingsSchema = z.object({
  selectedMarkets: z.array(z.string().min(1)).min(1, "Select at least one market"),
  tradingMode: z.enum(TRADING_MODES),
  stake: z.number().positive("Stake must be greater than 0").max(100000),
  maxLossPerTrade: z.number().positive("Maximum loss must be greater than 0").max(100000),
  maxConsecutiveLosses: z.number().int().min(1).max(50),
  dailyLossLimit: z.number().positive("Daily loss limit must be greater than 0").max(1000000),
  capitalProtection: z.boolean(),
  confidenceThreshold: z.number().min(50).max(100),
  cooldownSeconds: z.number().int().min(0).max(3600),
  autoTrading: z.boolean(),
  tradingSession: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  }),
});

export type BotSettings = z.infer<typeof botSettingsSchema>;

/**
 * Forex and Indices settings are stored under separate keys and never merged,
 * so changing one bot can never modify the other.
 */
export const SETTINGS_STORAGE_KEY: Record<BotType, string> = {
  forex: "kocel:settings:forex:v1",
  indices: "kocel:settings:indices:v1",
};

export function defaultSettings(botType: BotType): BotSettings {
  const markets = (botType === "forex" ? FOREX_MARKETS : INDICES_MARKETS).map((m) => m.symbol);
  return {
    selectedMarkets: markets,
    tradingMode: "normal",
    stake: 0.5,
    maxLossPerTrade: 1,
    maxConsecutiveLosses: 3,
    dailyLossLimit: 5,
    capitalProtection: false,
    confidenceThreshold: 85,
    cooldownSeconds: 10,
    autoTrading: false,
    tradingSession: { enabled: false, start: "08:00", end: "18:00" },
  };
}

/**
 * Local persistence only holds non-sensitive bot configuration. The shape is
 * bot-scoped so it can be moved to server-side, per-user storage in a later
 * phase without changing the UI.
 */
export function loadSettings(botType: BotType): BotSettings {
  const fallback = defaultSettings(botType);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY[botType]);
    if (!raw) return fallback;
    const parsed = botSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function persistSettings(botType: BotType, settings: BotSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_STORAGE_KEY[botType], JSON.stringify(settings));
}
