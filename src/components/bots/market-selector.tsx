import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Metric, Panel, PhaseTag } from "@/components/bots/panel";
import { marketsFor } from "@/bots/markets";
import type { BotType } from "@/bots/contracts";

/** Market checklist. Selection is persisted per bot and used by later phases. */
export function MarketSelector({
  botType,
  selected,
  onChange,
}: {
  botType: BotType;
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const markets = marketsFor(botType);

  function toggle(symbol: string, checked: boolean) {
    onChange(checked ? [...selected, symbol] : selected.filter((s) => s !== symbol));
  }

  return (
    <div className="space-y-2">
      {markets.map((market) => {
        const id = `market-${botType}-${market.symbol}`;
        const isChecked = selected.includes(market.symbol);
        return (
          <div
            key={market.symbol}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <Checkbox
              id={id}
              checked={isChecked}
              onCheckedChange={(value) => toggle(market.symbol, value === true)}
            />
            <Label htmlFor={id} className="flex-1 cursor-pointer flex-col items-start gap-0.5">
              <span className="text-sm font-semibold text-foreground">{market.label}</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                {market.description}
              </span>
            </Label>
            <span className="font-mono text-[11px] text-muted-foreground">{market.symbol}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Live market cards. The fields differ per bot because the two data engines
 * expose different measurements.
 */
export function MarketCards({
  botType,
  selected,
  fields,
  phaseTag,
  description,
}: {
  botType: BotType;
  selected: string[];
  fields: string[];
  phaseTag: string;
  description: string;
}) {
  const markets = marketsFor(botType).filter((m) => selected.includes(m.symbol));

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {markets.map((market) => (
        <Panel
          key={market.symbol}
          title={market.label}
          description={description}
          action={<PhaseTag>{phaseTag}</PhaseTag>}
        >
          <div className="grid grid-cols-2 gap-2">
            {fields.map((field) => (
              <Metric key={field} label={field} />
            ))}
          </div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {market.symbol} · feed inactive
          </p>
        </Panel>
      ))}
      {markets.length === 0 ? (
        <Panel title="No markets selected" description="Enable markets in this bot's settings.">
          <p className="text-sm text-muted-foreground">
            Choose at least one market so the data engine knows what to subscribe to.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
