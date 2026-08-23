import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { marketsFor } from "@/bots/markets";

/** Market checklist. Selection is persisted per bot and used by later phases. */
export function MarketSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const markets = marketsFor();

  function toggle(symbol: string, checked: boolean) {
    onChange(checked ? [...selected, symbol] : selected.filter((s) => s !== symbol));
  }

  return (
    <div className="space-y-2">
      {markets.map((market) => {
        const id = `market-indices-${market.symbol}`;
        const isChecked = selected.includes(market.symbol);
        return (
          <div
            key={market.symbol}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <Checkbox
              id={id}
              checked={isChecked}
              disabled={isChecked && selected.length <= 3}
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
