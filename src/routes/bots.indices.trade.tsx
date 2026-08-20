import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { BotControls } from "@/components/bots/bot-controls";
import {
  BotActivityPanel,
  CurrentTradePanel,
  DailyStatsPanel,
} from "@/components/bots/bot-activity";
import { Metric, Panel } from "@/components/bots/panel";
import { useBotRuntime } from "@/bots/bot-runtime";
import { useBotSettings } from "@/bots/use-bot-settings";
import { useDerivSession } from "@/hooks/use-deriv-session";
import { marketLabel } from "@/bots/markets";

export const Route = createFileRoute("/bots/indices/trade")({
  component: IndicesTrade,
});

function IndicesTrade() {
  const { status } = useDerivSession();
  const { settings } = useBotSettings("indices");
  const { state, snapshot, busy, start, stop } = useBotRuntime("indices", status === "connected");

  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Indices trading"
        description="Start the bot and it trades on its own. Tick analysis runs internally."
      />

      <BotControls
        botType="indices"
        state={state}
        busy={busy}
        settings={settings}
        onStart={start}
        onStop={stop}
      />

      <DailyStatsPanel snapshot={snapshot} />
      <BotActivityPanel snapshot={snapshot} />
      <CurrentTradePanel snapshot={snapshot} marketLabel="Index" durationLabel="Ticks" />

      <Panel title="Active configuration" description="Read from this bot's own settings.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Stake" value={`$${settings.stake.toFixed(2)}`} />
          <Metric label="Trading mode" value={settings.tradingMode} />
          <Metric label="Daily loss limit" value={`$${settings.dailyLossLimit.toFixed(2)}`} />
          <Metric label="Cooldown" value={`${settings.cooldownSeconds}s`} />
          <Metric
            label="Markets"
            value={settings.selectedMarkets.map((s) => marketLabel("indices", s)).join(", ")}
            className="col-span-2"
          />
          <Metric label="Auto-trading" value={settings.autoTrading ? "On" : "Off"} />
          <Metric label="Capital protection" value={settings.capitalProtection ? "On" : "Off"} />
        </div>
      </Panel>
    </div>
  );
}
