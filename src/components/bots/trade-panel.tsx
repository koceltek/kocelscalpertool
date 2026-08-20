import { Metric, Panel, PhaseTag } from "@/components/bots/panel";

/** Active-trade panel. Phase 2 always shows "No active trade". */
export function TradePanel({
  marketFieldLabel,
  phaseTag,
}: {
  marketFieldLabel: string;
  phaseTag: string;
}) {
  return (
    <Panel
      title="Trade"
      description="Populated by the execution engine once a contract is open."
      action={<PhaseTag>{phaseTag}</PhaseTag>}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label={marketFieldLabel} />
        <Metric label="Direction" />
        <Metric label="Stake" />
        <Metric label="Duration" />
        <Metric label="Entry" />
      </div>
      <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
        Status: <span className="font-mono uppercase tracking-widest">No active trade</span>
      </p>
    </Panel>
  );
}
