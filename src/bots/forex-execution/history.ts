import type { ForexTrade } from "./types";
const KEY = "kocel:forex:trades:v1";
export function loadForexTrades(): ForexTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
export function saveForexTrade(trade: ForexTrade) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    KEY,
    JSON.stringify(
      [trade, ...loadForexTrades().filter((item) => item.tradeId !== trade.tradeId)].slice(0, 500),
    ),
  );
}
