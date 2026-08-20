import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { NO_VALUE } from "@/bots/contracts";

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <Card className={cn("gap-4 border-border bg-card p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** A label + value pair where the value comes from a future engine. */
export function Metric({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value?: string | undefined;
  note?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("min-w-0 rounded-lg border border-border/70 bg-surface px-3 py-2.5", className)}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-foreground">{value ?? NO_VALUE}</p>
      {note ? <p className="mt-1 text-[11px] leading-snug text-muted-foreground/80">{note}</p> : null}
    </div>
  );
}

export function PhaseTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-info">
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  message,
  tag,
}: {
  title: string;
  message: string;
  tag?: string | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-surface/60 px-5 py-10 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{message}</p>
      {tag ? <PhaseTag>{tag}</PhaseTag> : null}
    </div>
  );
}
