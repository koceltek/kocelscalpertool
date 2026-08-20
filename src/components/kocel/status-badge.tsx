import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneStyles: Record<StatusTone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-info/40 bg-info/10 text-info",
  neutral: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({
  tone = "neutral",
  label,
  symbol,
  pulse = false,
  className,
}: {
  tone?: StatusTone | undefined;
  label: string;
  /** Text symbol so status is never conveyed by colour alone. */
  symbol?: string | undefined;
  pulse?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        toneStyles[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("font-mono", pulse && "animate-pulse")}>
        {symbol ?? "●"}
      </span>
      <span>{label}</span>
    </span>
  );
}
