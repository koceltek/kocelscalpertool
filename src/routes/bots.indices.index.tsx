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
import { INDICES_MARKET_FIELDS, INDICES_SIGNAL_FIELDS } from "@/bots/indices-fields";

export const Route = createFileRoute("/bots/indices/")({
  component: IndicesOverview,
});

function IndicesOverview() {
  const { status, reconnectAttempt } = useDerivSession();
  const { settings } = useBotSettings("indices");

  return (
    <div className="space-y-5">
      <BotPageHeading
        title="Overview"
        description="Live account is connected. Tick analysis and execution engines arrive in later phases."
      />

      <EngineStatusPanel
        engineName="Indices scalping engine"
        phaseNote="Data Engine (Phase 3) and Strategy Engine (Phase 5) are not part of this build."
        futureStates={[
          "Idle",
          "Streaming ticks",
          "Analyzing momentum",
          "Signal ready",
          "Entering trade",
          "Trade active",
          "Cooldown",
          "Risk locked",
        ]}
        connection={status}
        attempt={reconnectAttempt}
      />

      <SignalPanel fields={INDICES_SIGNAL_FIELDS} phaseTag="Phase 5" />
      <TradePanel marketFieldLabel="Index" phaseTag="Phase 6" />
      <PerformancePanel stats={emptyStats("indices")} title="Indices performance" />

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
