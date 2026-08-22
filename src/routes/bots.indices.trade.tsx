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
import { useIndicesData } from "@/bots/indices-data";
import { useIndicesStrategy } from "@/bots/indices-strategy";
import { useIndicesExecution } from "@/bots/indices-execution";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/bots/indices/trade")({
  component: IndicesTrade,
});

function IndicesTrade() {
  const { status, account, refresh } = useDerivSession();
  const { settings } = useBotSettings("indices");
  const { state, snapshot, busy, start, stop, fail } = useBotRuntime("indices", status === "connected");
  const indicesData = useIndicesData(state === "running" || state === "starting");
  const execution = useIndicesExecution(
    state === "running",
    settings.autoTrading,
    settings,
    (symbol) => indicesData.engine.getMarketSnapshot(symbol),
    account?.balance ?? null,
    account?.currency ?? "",
    () => void refresh(),
  );
  useIndicesStrategy(state === "running", (signal) => void execution.executeSignal(signal));

  useEffect(() => {
    if (indicesData.status === "ERROR" && (state === "starting" || state === "running")) {
      fail();
      toast.error("Indices market data could not start", { description: "Check the Deriv connection and try again." });
    }
  }, [fail, indicesData.status, state]);

  const startIndices = () => {
    start();
    void indicesData.engine.start().catch(() => undefined);
  };

  const stopIndices = () => {
    indicesData.engine.stop();
    stop();
  };

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
        onStart={startIndices}
        onStop={stopIndices}
        accountType={account?.accountType}
      />

      <Panel title="Market data" description="Live Synthetic Indices data only. Strategy and execution are separate phases.">
        {indicesData.status === "ERROR" ? (
          <ErrorAlert title="Indices market data error" message="Deriv did not return usable market data. Check the connection and try starting again." />
        ) : null}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Engine" value={indicesData.status} />
          <Metric label="Enabled indices" value={String(indicesData.engine.getEnabledIndices().length)} />
          <Metric label="Ready indices" value={String(Object.values(indicesData.symbols).filter((item) => item.marketState.ready).length)} />
          <Metric label="Clock offset" value={`${Math.round(indicesData.serverTimeOffset)}ms`} />
          <Metric label="Protection" value={execution.status.protection} />
        </div>
      </Panel>

      {execution.status.activeTrade ? (
        <Panel title="Current trade" description="Open contract monitoring status.">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Market" value={execution.status.activeTrade.symbol} />
            <Metric label="Direction" value={execution.status.activeTrade.direction} />
            <Metric label="Stake" value={`$${execution.status.activeTrade.stake.toFixed(2)}`} />
            <Metric label="Current P/L" value={execution.status.activeTrade.currentProfit === null ? "--" : `$${execution.status.activeTrade.currentProfit.toFixed(2)}`} />
          </div>
        </Panel>
      ) : null}

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
