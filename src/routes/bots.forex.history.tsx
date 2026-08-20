import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { HistoryTable } from "@/components/bots/history-table";
import { PerformancePanel } from "@/components/bots/performance-panel";
import { emptyStats } from "@/bots/contracts";
import { FOREX_HISTORY_COLUMNS } from "@/bots/forex-fields";

export const Route = createFileRoute("/bots/forex/history")({
  component: ForexHistory,
});

function ForexHistory() {
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Forex history"
        description="Trades and statistics recorded by the forex bot only."
      />
      <PerformancePanel stats={emptyStats("forex")} title="Forex performance" />
      <HistoryTable columns={FOREX_HISTORY_COLUMNS} phaseTag="Phase 6" title="Forex trade history" />
    </div>
  );
}
