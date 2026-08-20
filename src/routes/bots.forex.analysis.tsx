import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { Metric, Panel, PhaseTag } from "@/components/bots/panel";
import { SignalPanel } from "@/components/bots/signal-panel";
import { FOREX_ANALYSIS_SECTIONS, FOREX_SIGNAL_FIELDS } from "@/bots/forex-fields";

export const Route = createFileRoute("/bots/forex/analysis")({
  component: ForexAnalysis,
});

function ForexAnalysis() {
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Forex analysis"
        description="Every panel below is filled by the forex strategy engine — no values are simulated."
      />

      <SignalPanel fields={FOREX_SIGNAL_FIELDS} phaseTag="Phase 4" />

      <div className="grid gap-4 lg:grid-cols-2">
        {FOREX_ANALYSIS_SECTIONS.map((section) => (
          <Panel
            key={section.title}
            title={section.title}
            description={section.description}
            action={<PhaseTag>Phase 4</PhaseTag>}
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
