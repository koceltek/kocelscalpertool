import { TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel, PhaseTag } from "@/components/bots/panel";

/**
 * Rise / Fall direction controls. Disabled in Phase 2 — they are prepared for
 * the Phase 6 execution engine and cannot place any trade.
 */
export function RiseFallControls({ phaseTag }: { phaseTag: string }) {
  return (
    <Panel
      title="Rise / Fall controls"
      description="Strategy Engine Required — these controls cannot execute a trade yet."
      action={<PhaseTag>{phaseTag}</PhaseTag>}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          disabled
          aria-disabled="true"
          className="h-16 justify-start gap-3 border-success/40 bg-success/5 text-base font-semibold text-success disabled:opacity-70"
        >
          <TrendingUp className="size-5" aria-hidden="true" />
          <span className="flex flex-col items-start leading-tight">
            RISE
            <span className="text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
              Strategy engine required
            </span>
          </span>
        </Button>
        <Button
          variant="outline"
          disabled
          aria-disabled="true"
          className="h-16 justify-start gap-3 border-destructive/40 bg-destructive/5 text-base font-semibold text-destructive disabled:opacity-70"
        >
          <TrendingDown className="size-5" aria-hidden="true" />
          <span className="flex flex-col items-start leading-tight">
            FALL
            <span className="text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
              Strategy engine required
            </span>
          </span>
        </Button>
      </div>
    </Panel>
  );
}
