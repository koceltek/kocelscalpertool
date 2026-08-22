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
  const { settings } = useBotSettings();
  const { state, snapshot, busy, start, stop, fail, ready } = useBotRuntime("indices", status === "connected");
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
    if (indicesData.status === "READY" && state === "starting") ready();
    if (indicesData.status === "ERROR" && (state === "starting" || state === "running")) {
      fail();
      toast.error("Indices market data could not start", { description: "Check the Deriv connection and try again." });
    }
  }, [fail, indicesData.status, ready, state]);

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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indicesData.engine.getEnabledIndices().map((metadata) => {
            const market = indicesData.symbols[metadata.symbol];
            const health = market?.dataHealth;
            const live = health?.state === "LIVE" && health.dataAge !== null && health.dataAge <= 10_000;
            const statusLabel = live ? "LIVE" : health?.state === "STALE" ? "STALE" : health?.state === "INITIALIZING" || health?.state === "LOADING_HISTORY" ? "CONNECTING" : "OFFLINE";
            return (
              <div key={metadata.symbol} className="rounded-lg border border-border/70 bg-surface px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{metadata.displayName}</p>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{statusLabel}</span>
                </div>
                <p className="mt-2 font-mono text-lg text-foreground">{market?.price === null || market?.price === undefined ? "--" : market.price.toFixed(metadata.precision)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Last tick: {market?.tick?.receivedAt ? new Date(market.tick.receivedAt).toLocaleTimeString() : "--"}</p>
                <p className="text-xs text-muted-foreground">Ticks: {market?.marketState.tickCount ?? 0}</p>
                {health?.error ? <p className="mt-1 text-xs text-destructive">{health.error}</p> : null}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Engine" value={indicesData.status} />
          <Metric label="Ready indices" value={`${indicesData.readyCount} / ${indicesData.configuredCount}`} />
          <Metric label="Strategy" value={state === "running" && indicesData.readyCount > 0 ? "SCANNING" : indicesData.message ?? "WAITING FOR DATA"} />
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
            value={settings.selectedMarkets.map((s) => marketLabel(s)).join(", ")}
            className="col-span-2"
          />
          <Metric label="Auto-trading" value={settings.autoTrading ? "On" : "Off"} />
          <Metric label="Capital protection" value={settings.capitalProtection ? "On" : "Off"} />
        </div>
      </Panel>
    </div>
  );
}
