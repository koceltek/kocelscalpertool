import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AppHeader } from "@/components/kocel/app-header";
import { AccountSwitcher } from "@/components/kocel/account-switcher";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { LoadingSpinner } from "@/components/kocel/loading-spinner";
import { Button } from "@/components/ui/button";
import { useDerivLogout, useDerivSession } from "@/hooks/use-deriv-session";
import { ERROR_MESSAGES } from "@/lib/deriv-types";
import { BOT_LABEL, type BotType } from "@/bots/contracts";
import { cn } from "@/lib/utils";

type ForexPath =
  | "/bots/forex"
  | "/bots/forex/markets"
  | "/bots/forex/analysis"
  | "/bots/forex/trade"
  | "/bots/forex/history"
  | "/bots/forex/settings";

type IndicesPath =
  | "/bots/indices"
  | "/bots/indices/markets"
  | "/bots/indices/analysis"
  | "/bots/indices/trade"
  | "/bots/indices/history"
  | "/bots/indices/settings";

export type BotNavItem = { label: string; to: ForexPath | IndicesPath };

export const FOREX_NAV: BotNavItem[] = [
  { label: "Overview", to: "/bots/forex" },
  { label: "Markets", to: "/bots/forex/markets" },
  { label: "Analysis", to: "/bots/forex/analysis" },
  { label: "Trade", to: "/bots/forex/trade" },
  { label: "History", to: "/bots/forex/history" },
  { label: "Settings", to: "/bots/forex/settings" },
];

export const INDICES_NAV: BotNavItem[] = [
  { label: "Overview", to: "/bots/indices" },
  { label: "Markets", to: "/bots/indices/markets" },
  { label: "Analysis", to: "/bots/indices/analysis" },
  { label: "Trade", to: "/bots/indices/trade" },
  { label: "History", to: "/bots/indices/history" },
  { label: "Settings", to: "/bots/indices/settings" },
];

export function navFor(botType: BotType): BotNavItem[] {
  return botType === "forex" ? FOREX_NAV : INDICES_NAV;
}

/**
 * Authenticated shell for a single bot environment. Phase 1 auth behaviour is
 * unchanged: an expired session sends the user back to the login screen.
 */
export function BotShell({ botType, tagline }: { botType: BotType; tagline: string }) {
  const navigate = useNavigate();
  const { status, reconnectAttempt, authState, account, isLoading, isError, refresh } =
    useDerivSession();
  const logout = useDerivLogout();
  const [loggingOut, setLoggingOut] = useState(false);

  const unauthenticated = authState !== null && !authState.authenticated;

  useEffect(() => {
    if (unauthenticated && !loggingOut) {
      navigate({ to: "/", search: { reason: "expired" }, replace: true });
    }
  }, [unauthenticated, loggingOut, navigate]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate({ to: "/", replace: true });
  }

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <LoadingSpinner label={`Loading ${BOT_LABEL[botType]}...`} />
      </main>
    );
  }

  const nav = navFor(botType);

  return (
    <div className="min-h-dvh">
      <AppHeader
        account={account}
        status={status}
        attempt={reconnectAttempt}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
              <Link to="/dashboard">
                <ArrowLeft className="size-4" aria-hidden="true" />
                All bots
              </Link>
            </Button>
            <h1 className="truncate text-lg font-bold text-foreground sm:text-2xl">
              {BOT_LABEL[botType]}
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">{tagline}</p>
          </div>
          {authState && authState.accounts.length > 1 ? (
            <AccountSwitcher accounts={authState.accounts} active={account} />
          ) : null}
        </div>

        <div className="flex gap-6 pb-24 lg:pb-8">
          <nav
            aria-label={`${BOT_LABEL[botType]} sections`}
            className="hidden w-52 shrink-0 flex-col gap-1 py-6 lg:flex"
          >
            {nav.map((item) => (
              <BotNavLink key={item.to} item={item} />
            ))}
          </nav>

          <main className="min-w-0 flex-1 space-y-5 py-6">
            {isError ? (
              <ErrorAlert
                title="Deriv connection problem"
                message={ERROR_MESSAGES.API_ERROR}
                actionLabel="Reconnect"
                onAction={refresh}
              />
            ) : null}
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        aria-label={`${BOT_LABEL[botType]} sections`}
        className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-border bg-background/95 px-2 py-2 backdrop-blur lg:hidden"
      >
        {nav.map((item) => (
          <BotNavLink key={item.to} item={item} compact />
        ))}
      </nav>
    </div>
  );
}

function BotNavLink({ item, compact }: { item: BotNavItem; compact?: boolean }) {
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.to.split("/").length === 3 }}
      className={cn(
        "shrink-0 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        compact && "text-xs",
      )}
      activeProps={{ className: "bg-accent text-foreground font-semibold" }}
    >
      {item.label}
    </Link>
  );
}

export function BotPageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
