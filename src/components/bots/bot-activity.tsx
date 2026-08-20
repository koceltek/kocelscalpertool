import { Panel } from "@/components/bots/panel";
import { ACTIVITY_LABEL, type BotRuntimeSnapshot } from "@/bots/bot-runtime";
import { NO_VALUE } from "@/bots/contracts";

function money(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

/** Live activity line: what the bot is doing right now, nothing more. */
export function BotActivityPanel({ snapshot }: { snapshot: BotRuntimeSnapshot }) {
  return (
    <Panel title="Bot activity" description="The bot reports only its current action.">
      <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground">
        {ACTIVITY_LABEL[snapshot.activity]}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Line label="Current market" value={snapshot.currentMarket} />
        <Line label="Bot action" value={snapshot.botAction} />
        <Line label="Next action" value={snapshot.nextAction} />
      </div>
    </Panel>
  );
}

/** Current contract area. Populated by the execution engine in a later phase. */
export function CurrentTradePanel({
  snapshot,
  marketLabel,
  durationLabel,
}: {
  snapshot: BotRuntimeSnapshot;
  marketLabel: string;
  durationLabel: string;
}) {
  const trade = snapshot.currentTrade;

  return (
    <Panel title="Current trade" description="Shown only while a contract is open.">
      {trade ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Line label={marketLabel} value={trade.market} />
          <Line label="Direction" value={trade.direction} />
          <Line label="Stake" value={`$${trade.stake.toFixed(2)}`} />
          <Line label={durationLabel} value={trade.duration} />
          <Line label="Status" value={trade.contractStatus} />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface/60 px-4 py-6 text-center text-sm text-muted-foreground">
          No active trade
        </p>
      )}
    </Panel>
  );
}

/** Compact daily statistics for this bot only. */
export function DailyStatsPanel({ snapshot }: { snapshot: BotRuntimeSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Today's trades" value={String(snapshot.todayTrades)} />
      <Stat label="Wins" value={String(snapshot.wins)} />
      <Stat label="Losses" value={String(snapshot.losses)} />
      <Stat label="Today's P/L" value={money(snapshot.todayProfitLoss)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg text-foreground">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-foreground">{value ?? NO_VALUE}</p>
    </div>
  );
}
