import { StatusBadge, type StatusTone } from "@/components/kocel/status-badge";
import type { ForexDataSnapshot } from "@/bots/data/types";

type Presentation = { tone: StatusTone; label: string; symbol: string; pulse: boolean };

function present(snapshot: ForexDataSnapshot, active: boolean): Presentation {
  if (!active) return { tone: "neutral", label: "Market data off", symbol: "○", pulse: false };

  switch (snapshot.engineStatus) {
    case "LIVE":
      return { tone: "success", label: "Market data live", symbol: "●", pulse: false };
    case "PARTIALLY_LIVE":
      return { tone: "warning", label: "Market data partial", symbol: "◐", pulse: false };
    case "DEGRADED":
      return { tone: "warning", label: "Market data delayed", symbol: "⚠", pulse: false };
    case "ERROR":
      return { tone: "danger", label: "Market data error", symbol: "⚠", pulse: false };
    case "STOPPED":
    case "OFFLINE":
      return { tone: "neutral", label: "Market data off", symbol: "○", pulse: false };
    default:
      return { tone: "info", label: "Connecting", symbol: "◌", pulse: true };
  }
}

/** Minimal operational indicator for the market-data engine. */
export function DataStatusBadge({
  snapshot,
  active,
}: {
  snapshot: ForexDataSnapshot;
  active: boolean;
}) {
  const { tone, label, symbol, pulse } = present(snapshot, active);
  return <StatusBadge tone={tone} label={label} symbol={symbol} pulse={pulse} />;
}
