import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { HistoryTable } from "@/components/bots/history-table";
import { PerformancePanel } from "@/components/bots/performance-panel";
import { emptyStats } from "@/bots/contracts";
import { FOREX_HISTORY_COLUMNS } from "@/bots/forex-fields";
import { loadForexTrades } from "@/bots/forex-execution/history";

export const Route = createFileRoute("/bots/forex/history")({
  component: ForexHistory,
});

function ForexHistory() {
  const rows = loadForexTrades().filter((trade) => trade.result !== "OPEN").map((trade) => [
    new Date(trade.closedAt ?? trade.openedAt).toLocaleString(),
    trade.symbol,
    trade.direction,
    `$${trade.stake.toFixed(2)}`,
    "--",
    trade.buyPrice.toFixed(5),
    trade.exitPrice?.toFixed(5) ?? "--",
    trade.result,
    trade.profit === null ? "--" : `${trade.profit >= 0 ? "+" : "-"}$${Math.abs(trade.profit).toFixed(2)}`,
  ]);
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Forex history"
        description="Trades and statistics recorded by the forex bot only."
      />
      <PerformancePanel stats={emptyStats("forex")} title="Forex performance" />
      <HistoryTable columns={FOREX_HISTORY_COLUMNS} title="Forex trade history" rows={rows} />
    </div>
  );
}
