import { Metric, Panel, PhaseTag } from "@/components/bots/panel";

/** Signal card. No signal is ever generated in Phase 2. */
export function SignalPanel({
  fields,
  phaseTag,
}: {
  fields: string[];
  phaseTag: string;
}) {
  return (
    <Panel
      title="Current signal"
      description="Values are supplied by the strategy engine — nothing is estimated here."
      action={<PhaseTag>{phaseTag}</PhaseTag>}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {fields.map((field) => (
          <Metric key={field} label={field} />
        ))}
      </div>
      <p className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Status: waiting for strategy engine
      </p>
    </Panel>
  );
}
