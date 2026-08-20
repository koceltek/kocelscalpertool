import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { HistoryTable } from "@/components/bots/history-table";
import { PerformancePanel } from "@/components/bots/performance-panel";
import { emptyStats } from "@/bots/contracts";
import { INDICES_HISTORY_COLUMNS } from "@/bots/indices-fields";

export const Route = createFileRoute("/bots/indices/history")({
  component: IndicesHistory,
});

function IndicesHistory() {
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Indices history"
        description="Trades and statistics recorded by the indices bot only."
      />
      <PerformancePanel stats={emptyStats("indices")} title="Indices performance" />
      <HistoryTable
        columns={INDICES_HISTORY_COLUMNS}
        phaseTag="Phase 6"
        title="Indices trade history"
      />
    </div>
  );
}
