import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { BotSettingsForm } from "@/components/bots/settings-form";

export const Route = createFileRoute("/bots/forex/settings")({
  component: ForexSettings,
});

function ForexSettings() {
  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Forex settings"
        description="These settings belong to the forex scalper and never affect the indices bot."
      />
      <BotSettingsForm
        botType="forex"
        sessionNote="Forex liquidity varies by session — restrict trading to the London / New York overlap if preferred."
      />
    </div>
  );
}
