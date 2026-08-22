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
        description="Configure the Indices Scalper Bot's markets, strategy and risk controls."
      />
      <BotSettingsForm
        sessionNote="Synthetic indices trade 24/7 — session limits are optional and purely for discipline."
      />
    </div>
  );
}
