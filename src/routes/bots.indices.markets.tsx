import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { MarketCards, MarketSelector } from "@/components/bots/market-selector";
import { Panel } from "@/components/bots/panel";
import { Button } from "@/components/ui/button";
import { useBotSettings } from "@/bots/use-bot-settings";
import { INDICES_MARKET_FIELDS } from "@/bots/indices-fields";

export const Route = createFileRoute("/bots/indices/markets")({
  component: IndicesMarkets,
});

function IndicesMarkets() {
  const { settings, update, save } = useBotSettings("indices");

  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Synthetic indices"
        description="Choose which volatility indices the tick scalper will watch."
      />

      <Panel
        title="Watchlist"
        description="Only selected indices will be streamed tick-by-tick."
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
          botType="indices"
          selected={settings.selectedMarkets}
          onChange={(next) => update({ selectedMarkets: next })}
        />
      </Panel>

      <MarketCards
        botType="indices"
        selected={settings.selectedMarkets}
        fields={INDICES_MARKET_FIELDS}
        phaseTag="Phase 3"
        description="Awaiting tick data engine"
      />
    </div>
  );
}
