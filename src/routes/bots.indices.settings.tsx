import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { BotSettingsForm } from "@/components/bots/settings-form";

export const Route = createFileRoute("/bots/indices/settings")({
  component: IndicesSettings,
});

function IndicesSettings() {
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Indices settings"
        description="These settings belong to the indices scalper and never affect the forex bot."
      />
      <BotSettingsForm
        botType="indices"
        sessionNote="Synthetic indices trade 24/7 — session limits are optional and purely for discipline."
      />
    </div>
  );
}
