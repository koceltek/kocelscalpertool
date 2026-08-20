import { createFileRoute } from "@tanstack/react-router";

import { EngineStatusPanel } from "@/components/bots/engine-status";
import { PerformancePanel } from "@/components/bots/performance-panel";
import { SignalPanel } from "@/components/bots/signal-panel";
import { TradePanel } from "@/components/bots/trade-panel";
import { MarketCards } from "@/components/bots/market-selector";
import { BotPageHeading } from "@/components/bots/bot-shell";
import { emptyStats } from "@/bots/contracts";
import { useBotSettings } from "@/bots/use-bot-settings";
import { useDerivSession } from "@/hooks/use-deriv-session";
import { FOREX_SIGNAL_FIELDS, FOREX_MARKET_FIELDS } from "@/bots/forex-fields";

export const Route = createFileRoute("/bots/forex/")({
  component: ForexOverview,
});

function ForexOverview() {
  const { status, reconnectAttempt } = useDerivSession();
  const { settings } = useBotSettings("forex");

  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Overview"
        description="Live account is connected. Analysis and execution engines arrive in later phases."
      />

      <EngineStatusPanel
        engineName="Forex scalping engine"
        phaseNote="Data Engine (Phase 3) and Strategy Engine (Phase 4) are not part of this build."
        futureStates={[
          "Idle",
          "Scanning markets",
          "Analyzing trend",
          "Signal ready",
          "Entering trade",
          "Trade active",
          "Cooldown",
          "Risk locked",
        ]}
        connection={status}
        attempt={reconnectAttempt}
      />

      <SignalPanel fields={FOREX_SIGNAL_FIELDS} phaseTag="Phase 4" />
      <TradePanel marketFieldLabel="Pair" phaseTag="Phase 6" />
      <PerformancePanel stats={emptyStats("forex")} title="Forex performance" />

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
