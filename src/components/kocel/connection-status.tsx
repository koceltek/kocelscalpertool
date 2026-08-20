import { StatusBadge, type StatusTone } from "@/components/kocel/status-badge";
import type { ConnectionStatus } from "@/hooks/use-deriv-session";

const map: Record<ConnectionStatus, { label: string; tone: StatusTone; symbol: string; pulse: boolean }> = {
  connected: { label: "Connected", tone: "success", symbol: "●", pulse: false },
  connecting: { label: "Connecting", tone: "info", symbol: "◌", pulse: true },
  reconnecting: { label: "Reconnecting", tone: "warning", symbol: "↻", pulse: true },
  disconnected: { label: "Disconnected", tone: "danger", symbol: "●", pulse: false },
};

export function ConnectionStatusBadge({
  status,
  attempt,
  className,
}: {
  status: ConnectionStatus;
  attempt?: number;
  className?: string;
}) {
  const config = map[status];
  const label =
    status === "reconnecting" && attempt && attempt > 0
      ? `${config.label} · ${attempt}`
      : config.label;

  return (
    <StatusBadge
      tone={config.tone}
      symbol={config.symbol}
      pulse={config.pulse}
      label={label}
      className={className}
    />
  );
}
