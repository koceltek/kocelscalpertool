import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Activity, LineChart } from "lucide-react";
import { useEffect, useState } from "react";

import { AccountCard } from "@/components/kocel/account-card";
import { AccountSwitcher } from "@/components/kocel/account-switcher";
import { AppHeader, DesktopNav } from "@/components/kocel/app-header";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { LoadingSpinner } from "@/components/kocel/loading-spinner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDerivLogout, useDerivSession } from "@/hooks/use-deriv-session";
import { ERROR_MESSAGES } from "@/lib/deriv-types";
import { FOREX_MARKETS, INDICES_MARKETS } from "@/bots/markets";

export const Route = createFileRoute("/dashboard")({
  // Session lives in an HttpOnly cookie and is validated per request by the
  // server functions; the shell itself is client-rendered.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choose a Bot — Kocel Rise & Fall Bot" },
      {
        name: "description",
        content:
          "Pick the Forex Scalper or Indices Scalper environment. Each bot keeps its own markets, settings, statistics and trade history.",
      },
      { property: "og:title", content: "Kocel Bot Selection" },
      {
        property: "og:description",
        content: "Two isolated Rise & Fall scalping environments on your connected Deriv account.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
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
        <LoadingSpinner label="Loading account..." />
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <AppHeader
        account={account}
        status={status}
        attempt={reconnectAttempt}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 sm:px-6">
        <DesktopNav />

        <main className="min-w-0 flex-1 space-y-5 py-6">
          <div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Choose your bot</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Both environments run on the account selected below. Settings, statistics and trade
              history stay completely separate per bot.
            </p>
          </div>

          {isError ? (
            <ErrorAlert
              title="Deriv connection problem"
              message={ERROR_MESSAGES.API_ERROR}
              actionLabel="Reconnect"
              onAction={refresh}
            />
          ) : null}

          {status === "reconnecting" ? (
            <Card className="border-warning/40 bg-warning/10 p-4 text-sm">
              <p className="font-semibold text-foreground">Connection lost.</p>
              <p className="text-muted-foreground">
                Reconnecting... attempt {Math.max(reconnectAttempt, 1)}
              </p>
            </Card>
          ) : null}

          {authState && authState.accounts.length > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Active account
                </p>
                <p className="text-sm text-muted-foreground">
                  You have {authState.accounts.length} Deriv accounts. Choose which demo or real
                  account the bots should use.
                </p>
              </div>
              <AccountSwitcher accounts={authState.accounts} active={account} />
            </div>
          ) : null}

          <AccountCard account={account} status={status} attempt={reconnectAttempt} />

          <div className="grid gap-4 lg:grid-cols-2">
            <BotCard
              title="Forex Scalper Bot"
              to="/bots/forex"
              icon={<LineChart className="size-5 text-primary" aria-hidden="true" />}
              summary="Rise & Fall scalping on major currency pairs using trend, momentum, volatility and market-structure confirmation."
              markets={FOREX_MARKETS.map((m) => m.label)}
              points={[
                "EMA trend stack + RSI / MACD momentum",
                "ATR and spread volatility filters",
                "Multi-timeframe confirmation before entry",
              ]}
            />
            <BotCard
              title="Indices Scalper Bot"
              to="/bots/indices"
              icon={<Activity className="size-5 text-info" aria-hidden="true" />}
              summary="Tick-level Rise & Fall scalping on synthetic volatility indices using momentum, velocity, pressure and exhaustion analysis."
              markets={INDICES_MARKETS.map((m) => m.label)}
              points={[
                "Tick momentum, velocity and acceleration",
                "Directional pressure and micro-trend detection",
                "Volatility spike and exhaustion vetoes",
              ]}
            />
          </div>

          <Button variant="outline" size="sm" className="w-fit" onClick={refresh}>
            Refresh connection
          </Button>
        </main>
      </div>
    </div>
  );
}

function BotCard({
  title,
  to,
  icon,
  summary,
  markets,
  points,
}: {
  title: string;
  to: "/bots/forex" | "/bots/indices";
  icon: React.ReactNode;
  summary: string;
  markets: string[];
  points: string[];
}) {
  return (
    <Card className="gap-4 border-border bg-card p-5 transition-colors hover:border-primary/50">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {markets.map((market) => (
          <span
            key={market}
            className="rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
          >
            {market}
          </span>
        ))}
      </div>

      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span aria-hidden="true" className="text-primary">
              ·
            </span>
            {point}
          </li>
        ))}
      </ul>

      <Button asChild className="w-full sm:w-fit">
        <Link to={to}>
          Open {title}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    </Card>
  );
}
