import { Metric, Panel } from "@/components/bots/panel";
import type { BotStats } from "@/bots/contracts";

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

/** Per-bot statistics. Values come from the bot's own isolated stats record. */
export function PerformancePanel({ stats, title }: { stats: BotStats; title: string }) {
  return (
    <Panel title={title} description="Today's activity for this bot only.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Metric label="Trades" value={String(stats.trades)} />
        <Metric label="Wins" value={String(stats.wins)} />
        <Metric label="Losses" value={String(stats.losses)} />
        <Metric
          label="Win rate"
          value={stats.winRate === null ? undefined : `${stats.winRate.toFixed(1)}%`}
        />
        <Metric label="Profit" value={money(stats.profit)} />
        <Metric label="Loss" value={money(stats.loss)} />
        <Metric label="Net result" value={money(stats.netResult)} />
        <Metric label="Consecutive wins" value={String(stats.consecutiveWins)} />
        <Metric label="Consecutive losses" value={String(stats.consecutiveLosses)} />
        <Metric label="Daily loss" value={money(stats.dailyLoss)} />
      </div>
    </Panel>
  );
}
