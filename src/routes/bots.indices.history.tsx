import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { HistoryTable } from "@/components/bots/history-table";
import { PerformancePanel } from "@/components/bots/performance-panel";
import { emptyStats } from "@/bots/contracts";
import { INDICES_HISTORY_COLUMNS } from "@/bots/indices-fields";
import { loadIndicesTrades } from "@/bots/indices-execution";
import { useState } from "react";

export const Route = createFileRoute("/bots/indices/history")({
  component: IndicesHistory,
});

function IndicesHistory() {
  const [trades] = useState(loadIndicesTrades);
  const stats = {
    ...emptyStats(),
    trades: trades.length,
    wins: trades.filter((trade) => trade.result === "WIN").length,
    losses: trades.filter((trade) => trade.result === "LOSS").length,
    profit: trades.filter((trade) => trade.result === "WIN").reduce((sum, trade) => sum + Math.max(0, trade.profit ?? 0), 0),
    loss: trades.filter((trade) => trade.result === "LOSS").reduce((sum, trade) => sum + Math.abs(Math.min(0, trade.profit ?? 0)), 0),
    netResult: trades.reduce((sum, trade) => sum + (trade.profit ?? 0), 0),
    dailyLoss: Math.abs(trades.filter((trade) => new Date(trade.closedAt ?? 0).toDateString() === new Date().toDateString()).reduce((sum, trade) => sum + Math.min(0, trade.profit ?? 0), 0)),
  };
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Indices history"
        description="Trades and statistics recorded by the indices bot only."
      />
      <PerformancePanel stats={stats} title="Indices performance" />
      <HistoryTable
        columns={INDICES_HISTORY_COLUMNS}
        title="Indices trade history"
        rows={trades.map((trade) => [
          new Date(trade.closedAt ?? trade.openedAt).toLocaleString(), trade.symbol, trade.direction,
          `$${trade.stake.toFixed(2)}`, "-", `$${trade.buyPrice.toFixed(2)}`,
          trade.exitPrice === null ? "-" : `$${trade.exitPrice.toFixed(2)}`,
          trade.result, trade.profit === null ? "-" : `$${trade.profit.toFixed(2)}`,
        ])}
      />
    </div>
  );
}
