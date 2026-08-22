import { Play, Square } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BOT_LABEL } from "@/bots/contracts";
import { RUN_STATE_LABEL, type BotRunState } from "@/bots/bot-runtime";
import type { BotSettings } from "@/bots/settings";
import { cn } from "@/lib/utils";

function stateTone(state: BotRunState) {
  switch (state) {
    case "running":
      return "text-success";
    case "starting":
    case "stopping":
      return "text-info";
    case "error":
    case "disconnected":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

/** Bot status readout plus the single large Start / Stop control. */
export function BotControls({
  state,
  busy,
  settings,
  onStart,
  onStop,
  accountType,
}: {
  state: BotRunState;
  busy: boolean;
  settings: BotSettings;
  onStart: () => void;
  onStop: () => void;
  accountType?: "DEMO" | "REAL" | "UNKNOWN";
}) {
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  const showStop = state === "running" || state === "stopping";
  const spinning = state === "starting" || state === "stopping";

  return (
    <Card className="items-center gap-5 border-border bg-card p-6 text-center">
      <p className={cn("flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]", stateTone(state))}>
        <span aria-hidden="true" className={cn(spinning && "animate-pulse")}>
          {spinning ? "◌" : "●"}
        </span>
        {RUN_STATE_LABEL[state]}
      </p>

      {showStop ? (
        <Button
          size="lg"
          variant="destructive"
          className="h-20 w-full max-w-sm text-lg font-bold uppercase tracking-widest"
          disabled={busy}
          onClick={() => setConfirmStop(true)}
        >
          <Square className="size-5" aria-hidden="true" />
          Stop bot
        </Button>
      ) : (
        <Button
          size="lg"
          className="h-20 w-full max-w-sm text-lg font-bold uppercase tracking-widest"
          disabled={busy || state === "disconnected"}
          onClick={() => setConfirmStart(true)}
        >
          <Play className="size-5" aria-hidden="true" />
          Start bot
        </Button>
      )}

      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        {state === "disconnected"
          ? "Reconnect your Deriv account before starting this bot."
          : accountType === "REAL"
              ? "REAL account: Start may place real-funds trades when auto-trading is enabled."
              : "Start begins scanning; trades require auto-trading and every safety check to pass."}
      </p>

      <AlertDialog open={confirmStart} onOpenChange={setConfirmStart}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start {BOT_LABEL}?</AlertDialogTitle>
            <AlertDialogDescription>
              {accountType === "REAL"
                ? "You are connected to a REAL Deriv account. Trading will use real funds when auto-trading is enabled."
                : "You are connected to a DEMO account. Trading will use demo funds when auto-trading is enabled."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-3 text-xs sm:grid-cols-3">
            <ConfirmFact label="Stake" value={`$${settings.stake.toFixed(2)}`} />
            <ConfirmFact label="Max loss / trade" value={`$${settings.maxLossPerTrade.toFixed(2)}`} />
            <ConfirmFact label="Daily loss limit" value={`$${settings.dailyLossLimit.toFixed(2)}`} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onStart}>Start bot</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmStop} onOpenChange={setConfirmStop}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop {BOT_LABEL}?</AlertDialogTitle>
            <AlertDialogDescription>
              Stopping the bot prevents new trades from being opened. Any already-active contract is
              handled according to its supported Deriv contract lifecycle — stopping does not
              guarantee an open contract can be closed early. History, statistics and settings are
              kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onStop}>Stop bot</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ConfirmFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-left">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}
