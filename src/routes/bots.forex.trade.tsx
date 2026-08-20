import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { RiseFallControls } from "@/components/bots/rise-fall-controls";
import { TradePanel } from "@/components/bots/trade-panel";
import { Metric, Panel } from "@/components/bots/panel";
import { useBotSettings } from "@/bots/use-bot-settings";
import { marketLabel } from "@/bots/markets";

export const Route = createFileRoute("/bots/forex/trade")({
  component: ForexTrade,
});

function ForexTrade() {
  const { settings } = useBotSettings("forex");

  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Forex trade"
        description="Execution is disabled until the strategy and execution engines are enabled."
      />

      <RiseFallControls phaseTag="Phase 6" />
      <TradePanel marketFieldLabel="Pair" phaseTag="Phase 6" />

      <Panel title="Configured entry parameters" description="Read from this bot's own settings.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Stake" value={`$${settings.stake.toFixed(2)}`} />
          <Metric label="Trading mode" value={settings.tradingMode} />
          <Metric label="Min confidence" value={`${settings.confidenceThreshold}%`} />
          <Metric label="Cooldown" value={`${settings.cooldownSeconds}s`} />
          <Metric
            label="Watchlist"
            value={settings.selectedMarkets.map((s) => marketLabel("forex", s)).join(", ")}
            className="col-span-2"
          />
          <Metric label="Auto-trading" value={settings.autoTrading ? "Preferred" : "Off"} />
          <Metric label="Capital protection" value={settings.capitalProtection ? "On" : "Off"} />
        </div>
      </Panel>
    </div>
  );
}
