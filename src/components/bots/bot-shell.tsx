import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { AppHeader } from "@/components/kocel/app-header";
import { AccountSwitcher } from "@/components/kocel/account-switcher";
import { ConnectionStatusBadge } from "@/components/kocel/connection-status";
import { formatBalance } from "@/components/kocel/account-card";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { LoadingSpinner } from "@/components/kocel/loading-spinner";
import { Button } from "@/components/ui/button";
import { useDerivLogout, useDerivSession } from "@/hooks/use-deriv-session";
import { ERROR_MESSAGES } from "@/lib/deriv-types";
import { BOT_LABEL, type BotType } from "@/bots/contracts";
import { useBotRuntime } from "@/bots/bot-runtime";
import { useIndicesData } from "@/bots/indices-data";
import { cn } from "@/lib/utils";

type IndicesPath = "/bots/indices/trade" | "/bots/indices/history" | "/bots/indices/settings";

export type BotNavItem = { label: string; to: IndicesPath };

/** Final navigation: Trade, History, Settings only. */
export const INDICES_NAV: BotNavItem[] = [
  { label: "Trade", to: "/bots/indices/trade" },
  { label: "History", to: "/bots/indices/history" },
  { label: "Settings", to: "/bots/indices/settings" },
];

export function navFor(_botType: BotType): BotNavItem[] { return INDICES_NAV; }

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
  const { state: botState } = useBotRuntime(botType, status === "connected");
  useIndicesData(botState === "running" || botState === "starting");

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
        <LoadingSpinner label={`Loading ${BOT_LABEL}...`} />
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
        {/* Live Deriv balance stays top-left of every bot screen. */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-4">
          <div className="min-w-0">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-muted-foreground">
              <Link to="/bots/indices/trade">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Indices bot
              </Link>
            </Button>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Balance</p>
            <p className="font-mono text-xl font-bold text-foreground sm:text-2xl">
              {formatBalance(account)}
            </p>
            <h1 className="mt-1 truncate text-sm font-bold uppercase tracking-[0.18em] text-foreground sm:text-base">
              {BOT_LABEL}
            </h1>
            <p className="text-xs text-muted-foreground">{tagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ConnectionStatusBadge status={status} attempt={reconnectAttempt} />
            {authState && authState.accounts.length > 1 ? (
              <AccountSwitcher accounts={authState.accounts} active={account} />
            ) : null}
          </div>
        </div>

        <div className="flex gap-6 pb-24 lg:pb-8">
          <nav
            aria-label={`${BOT_LABEL} sections`}
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
        aria-label={`${BOT_LABEL} sections`}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 gap-1 border-t border-border bg-background/95 px-2 py-2 backdrop-blur lg:hidden"
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
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        compact && "text-center text-[11px]",
      )}
      activeProps={{ className: "bg-accent text-foreground" }}
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
