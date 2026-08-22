import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import { Panel } from "@/components/bots/panel";
import { MarketSelector } from "@/components/bots/market-selector";
import { TRADING_MODES, type BotSettings, type TradingMode } from "@/bots/settings";
import { BOT_LABEL, type BotType } from "@/bots/contracts";
import { useBotSettings } from "@/bots/use-bot-settings";

const MODE_HINT: Record<TradingMode, string> = {
  conservative: "Fewer entries, highest confirmation requirements.",
  normal: "Balanced entry frequency and confirmation.",
  aggressive: "More entries, lower confirmation requirements.",
};

function numberInput(value: number, fallback: number) {
  return Number.isFinite(value) ? String(value) : String(fallback);
}

/**
 * Settings screen for one bot. State is keyed by bot type, so Forex settings
 * can never overwrite Indices settings.
 */
export function BotSettingsForm({
  botType,
  sessionNote,
}: {
  botType: BotType;
  sessionNote: string;
}) {
  const { settings, hydrated, save, update, reset } = useBotSettings(botType);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);

  function commit(patch: Partial<BotSettings>) {
    if (save({ ...settings, ...patch })) {
      toast.success("Settings saved");
    }
  }

  return (
    <div className="space-y-5">
      <Panel
        title="Markets"
        description={`Markets the ${BOT_LABEL[botType]} will subscribe to when the data engine is enabled.`}
      >
        <MarketSelector
          botType={botType}
          selected={settings.selectedMarkets}
          onChange={(next) => update({ selectedMarkets: next })}
        />
      </Panel>

      <Panel title="Trading mode" description="Controls how selective the strategy engine will be.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`mode-${botType}`}>Mode</Label>
            <Select
              value={settings.tradingMode}
              onValueChange={(value) => update({ tradingMode: value as TradingMode })}
            >
              <SelectTrigger id={`mode-${botType}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRADING_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode} className="capitalize">
                    {mode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{MODE_HINT[settings.tradingMode]}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`confidence-${botType}`}>
              Minimum confidence · {settings.confidenceThreshold}%
            </Label>
            <Slider
              id={`confidence-${botType}`}
              min={50}
              max={100}
              step={1}
              value={[settings.confidenceThreshold]}
              onValueChange={([value]) =>
                update({ confidenceThreshold: value ?? settings.confidenceThreshold })
              }
            />
            <p className="text-xs text-muted-foreground">
              Signals below this confidence will be discarded.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Risk management" description="Applied by the risk engine before every entry.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            id={`stake-${botType}`}
            label="Stake per trade (USD)"
            value={numberInput(settings.stake, 0.5)}
            step="0.1"
            onChange={(value) => update({ stake: Number(value) })}
          />
          <Field
            id={`maxloss-${botType}`}
            label="Max loss per trade (USD)"
            value={numberInput(settings.maxLossPerTrade, 1)}
            step="0.1"
            onChange={(value) => update({ maxLossPerTrade: Number(value) })}
          />
          <Field
            id={`streak-${botType}`}
            label="Max consecutive losses"
            value={numberInput(settings.maxConsecutiveLosses, 3)}
            step="1"
            onChange={(value) => update({ maxConsecutiveLosses: Number(value) })}
          />
          <Field
            id={`daily-${botType}`}
            label="Daily loss limit (USD)"
            value={numberInput(settings.dailyLossLimit, 5)}
            step="0.5"
            onChange={(value) => update({ dailyLossLimit: Number(value) })}
          />
          <Field
            id={`cooldown-${botType}`}
            label="Cooldown between trades (seconds)"
            value={numberInput(settings.cooldownSeconds, 10)}
            step="1"
            onChange={(value) => update({ cooldownSeconds: Number(value) })}
          />
          <ToggleRow
            id={`capital-${botType}`}
            label="Capital protection"
            hint="Stops the bot when the daily loss limit is reached."
            checked={settings.capitalProtection}
            onChange={(checked) => update({ capitalProtection: checked })}
          />
        </div>
      </Panel>

      <Panel title="Trading session" description={sessionNote}>
        <div className="grid gap-4 sm:grid-cols-3">
          <ToggleRow
            id={`session-${botType}`}
            label="Restrict to session hours"
            hint="Outside this window the bot stays idle."
            checked={settings.tradingSession.enabled}
            onChange={(checked) =>
              update({ tradingSession: { ...settings.tradingSession, enabled: checked } })
            }
          />
          <div className="space-y-2">
            <Label htmlFor={`start-${botType}`}>Start (UTC)</Label>
            <Input
              id={`start-${botType}`}
              type="time"
              value={settings.tradingSession.start}
              onChange={(event) =>
                update({
                  tradingSession: { ...settings.tradingSession, start: event.target.value },
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`end-${botType}`}>End (UTC)</Label>
            <Input
              id={`end-${botType}`}
              type="time"
              value={settings.tradingSession.end}
              onChange={(event) =>
                update({ tradingSession: { ...settings.tradingSession, end: event.target.value } })
              }
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Automation"
        description={botType === "indices" ? "When enabled, the Indices strategy may request trades after Start and all risk checks pass." : "Auto-trading requires the Forex execution phase."}
      >
        <ToggleRow
          id={`auto-${botType}`}
          label="Auto-trading"
          hint={botType === "indices" ? "Trades remain subject to signal, account, contract and risk validation." : "Saved as a preference until the Forex execution phase is enabled."}
          checked={settings.autoTrading}
          onChange={(checked) => {
            if (checked) {
              setConfirmAuto(true);
              return;
            }
            commit({ autoTrading: false });
          }}
        />
      </Panel>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => commit({})} disabled={!hydrated}>
          Save settings
        </Button>
        <Button variant="outline" onClick={() => setConfirmReset(true)}>
          Reset to defaults
        </Button>
        <span className="text-xs text-muted-foreground">
          Settings apply to the {BOT_LABEL[botType]} only.
        </span>
      </div>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {BOT_LABEL[botType]} settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores the default markets, risk limits and automation preference for this
              bot. The other bot is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                reset();
                toast.success("Settings reset to defaults");
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAuto} onOpenChange={setConfirmAuto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable auto-trading preference?</AlertDialogTitle>
            <AlertDialogDescription>
              Indices auto-trading can place real or demo trades after Start when all safety checks
              pass. Your configured stake is never increased automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => commit({ autoTrading: true })}>
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  step: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="font-mono"
      />
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <div>
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
