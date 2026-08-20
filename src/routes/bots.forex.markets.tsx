import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { MarketCards, MarketSelector } from "@/components/bots/market-selector";
import { Panel } from "@/components/bots/panel";
import { Button } from "@/components/ui/button";
import { useBotSettings } from "@/bots/use-bot-settings";
import { FOREX_MARKET_FIELDS } from "@/bots/forex-fields";

export const Route = createFileRoute("/bots/forex/markets")({
  component: ForexMarkets,
});

function ForexMarkets() {
  const { settings, update, save } = useBotSettings("forex");

  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Forex markets"
        description="Choose which currency pairs the forex scalper will watch."
      />

      <Panel
        title="Watchlist"
        description="Only selected pairs will be streamed by the data engine."
        action={
          <Button
            size="sm"
            onClick={() => {
              if (save(settings)) toast.success("Watchlist saved");
            }}
          >
            Save watchlist
          </Button>
        }
      >
        <MarketSelector
          botType="forex"
          selected={settings.selectedMarkets}
          onChange={(next) => update({ selectedMarkets: next })}
        />
      </Panel>

      <MarketCards
        botType="forex"
        selected={settings.selectedMarkets}
        fields={FOREX_MARKET_FIELDS}
        phaseTag="Phase 3"
        description="Awaiting forex data engine"
      />
    </div>
  );
}
