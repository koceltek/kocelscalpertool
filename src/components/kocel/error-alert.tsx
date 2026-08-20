import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorAlert({
  title,
  message,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" onClick={onAction} className="self-start sm:self-auto">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
