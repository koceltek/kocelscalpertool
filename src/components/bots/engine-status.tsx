import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/kocel/status-badge";
import { ConnectionStatusBadge } from "@/components/kocel/connection-status";
import type { ConnectionStatus } from "@/hooks/use-deriv-session";

/**
 * Engine status panel. The trading engines do not exist yet, so the panel
 * never claims the bot is active, scanning or trading.
 */
export function EngineStatusPanel({
  engineName,
  phaseNote,
  futureStates,
  connection,
  attempt,
}: {
  engineName: string;
  phaseNote: string;
  futureStates: string[];
  connection: ConnectionStatus;
  attempt?: number | undefined;
}) {
  return (
    <Card className="gap-4 border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="font-mono text-lg text-muted-foreground">
            ●
          </span>
          <div>
            <p className="font-semibold uppercase tracking-[0.14em] text-foreground">
              {engineName}
            </p>
            <p className="text-xs text-muted-foreground">{phaseNote}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="neutral" symbol="■" label="Engine not active" />
          <ConnectionStatusBadge status={connection} attempt={attempt} />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Future engine states
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {futureStates.map((state) => (
            <span
              key={state}
              className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {state}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
