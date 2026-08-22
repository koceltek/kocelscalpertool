import type { IndicesTrade } from "./types";

const KEY = "kocel:indices:trades:v1";
export function loadIndicesTrades(): IndicesTrade[] { if (typeof window === "undefined") return []; try { const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; } }
export function saveIndicesTrade(trade: IndicesTrade) { if (typeof window === "undefined") return; const trades = [trade, ...loadIndicesTrades().filter((item) => item.tradeId !== trade.tradeId)].slice(0, 500); window.localStorage.setItem(KEY, JSON.stringify(trades)); }
