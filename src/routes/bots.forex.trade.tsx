import { createFileRoute } from "@tanstack/react-router";

import { BotPageHeading } from "@/components/bots/bot-shell";
import { BotControls } from "@/components/bots/bot-controls";
import { DataStatusBadge } from "@/components/bots/data-status-badge";
import { Metric, Panel } from "@/components/bots/panel";
import { useBotRuntime } from "@/bots/bot-runtime";
import { useBotSettings } from "@/bots/use-bot-settings";
import { useDerivSession } from "@/hooks/use-deriv-session";
import { useForexData } from "@/bots/data/use-forex-data";
import { useForexStrategy } from "@/bots/strategy/use-forex-strategy";
import { useForexExecution } from "@/bots/forex-execution/use-forex-execution";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { toast } from "sonner";
import { useEffect } from "react";

export const Route = createFileRoute("/bots/forex/trade")({
  component: ForexTrade,
});

function ForexTrade() {
  const { status, account, refresh } = useDerivSession();
  const { settings } = useBotSettings("forex");
  const { state, busy, start, stop, fail } = useBotRuntime("forex", status === "connected");
  const data = useForexData(state === "running" || state === "starting");
  const execution = useForexExecution(
    state === "running",
    settings.autoTrading,
    settings,
    account?.balance ?? null,
    account?.currency ?? "",
    () => void refresh(),
  );
  useForexStrategy(state === "running", settings.selectedMarkets, execution.executeSignal);

  const closedMarkets = Object.values(data.symbols)
    .filter((symbol) => symbol.availability === "CLOSED")
    .map((symbol) => symbol.displayName);

  useEffect(() => {
    if (data.engineStatus === "ERROR") {
      if (state === "starting" || state === "running") fail();
      toast.error("Forex market data unavailable", { description: data.message });
    }
  }, [data.engineStatus, data.message, fail, state]);

  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Forex trading"
        description="Start the bot and it trades on its own. Analysis runs internally."
      />

      <BotControls
        botType="forex"
        state={state}
        busy={busy}
        settings={settings}
        onStart={start}
        onStop={stop}
        accountType={account?.accountType}
      />

      <DataStatusBadge snapshot={data} active={state === "running" || state === "starting"} />
      {data.engineStatus === "ERROR" ? (
        <ErrorAlert title="Forex market data error" message={data.message} />
      ) : null}
      {closedMarkets.length > 0 ? (
        <ErrorAlert
          title="Forex market closed"
          message={`${closedMarkets.join(", ")} is currently closed. The bot will wait until the market opens.`}
        />
      ) : null}
      <Panel title="Account" description="Authenticated Deriv account balance.">
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Balance"
            value={
              account?.balance === null || account?.balance === undefined
                ? "--"
                : `${account.currency ?? ""} ${account.balance.toFixed(2)}`
            }
          />
          <Metric label="Account" value={account?.accountType ?? "UNKNOWN"} />
        </div>
      </Panel>
      {execution.status.activeTrade ? (
        <Panel title="Current trade" description="Open Forex contract management.">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric label="Market" value={execution.status.activeTrade.symbol} />
            <Metric label="Direction" value={execution.status.activeTrade.direction} />
            <Metric
              label="Stake"
              value={`${account?.currency ?? ""} ${execution.status.activeTrade.stake.toFixed(2)}`}
            />
            <Metric
              label="Current P/L"
              value={
                execution.status.activeTrade.currentProfit === null
                  ? "--"
                  : `${execution.status.activeTrade.currentProfit >= 0 ? "+" : "-"}${account?.currency ?? ""} ${Math.abs(execution.status.activeTrade.currentProfit).toFixed(2)}`
              }
            />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
