import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { Metric, Panel, PhaseTag } from "@/components/bots/panel";
import { SignalPanel } from "@/components/bots/signal-panel";
import { INDICES_ANALYSIS_SECTIONS, INDICES_SIGNAL_FIELDS } from "@/bots/indices-fields";

export const Route = createFileRoute("/bots/indices/analysis")({
  component: IndicesAnalysis,
});

function IndicesAnalysis() {
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Tick analysis"
        description="Every panel below is filled by the indices strategy engine — no values are simulated."
      />

      <SignalPanel fields={INDICES_SIGNAL_FIELDS} phaseTag="Phase 5" />

      <div className="grid gap-4 lg:grid-cols-2">
        {INDICES_ANALYSIS_SECTIONS.map((section) => (
          <Panel
            key={section.title}
            title={section.title}
            description={section.description}
            action={<PhaseTag>Phase 5</PhaseTag>}
          >
            <div className="grid grid-cols-2 gap-2">
              {section.fields.map((field) => (
                <Metric key={field} label={field} />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
