import { cn } from "@/lib/utils";

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "grid place-items-center rounded-xl border border-primary/40 bg-primary/10 font-mono font-bold text-primary",
          size === "sm" && "size-8 text-sm",
          size === "md" && "size-10 text-base",
          size === "lg" && "size-14 text-xl",
        )}
      >
        K
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block font-bold tracking-[0.22em] text-foreground",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-2xl",
          )}
        >
          KOCEL
        </span>
        <span
          className={cn(
            "block uppercase tracking-[0.18em] text-muted-foreground",
            size === "lg" ? "text-xs sm:text-sm" : "text-[10px]",
          )}
        >
          Rise &amp; Fall Bot
        </span>
      </span>
    </div>
  );
}
