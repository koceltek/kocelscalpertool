import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AccountCard } from "@/components/kocel/account-card";
import { AppHeader, DesktopNav } from "@/components/kocel/app-header";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { LoadingSpinner } from "@/components/kocel/loading-spinner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDerivLogout, useDerivSession } from "@/hooks/use-deriv-session";
import { ERROR_MESSAGES } from "@/lib/deriv-types";

export const Route = createFileRoute("/dashboard")({
  // Session lives in an HttpOnly cookie and is validated per request by the
  // server functions; the shell itself is client-rendered.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Kocel Rise & Fall Bot" },
      {
        name: "description",
        content:
          "Your connected Deriv account overview: live balance, account type and connection status.",
      },
      { property: "og:title", content: "Kocel Dashboard" },
      {
        property: "og:description",
        content: "Live Deriv account status inside the Kocel Rise & Fall Bot workspace.",
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
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              Welcome to Kocel Rise &amp; Fall Bot
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your Deriv account is connected. Account data below is read live from Deriv.
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

          <AccountCard account={account} status={status} attempt={reconnectAttempt} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-dashed border-border bg-surface p-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Next</p>
              <h2 className="mt-2 text-base font-semibold text-foreground">Bot selection</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choosing between the Forex Scalper and Indices Scalper arrives in Phase 2. No
                trading logic is active in this build.
              </p>
            </Card>
            <Card className="border-dashed border-border bg-surface p-5">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Session
              </p>
              <h2 className="mt-2 text-base font-semibold text-foreground">Secure connection</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your Deriv access token is held server-side in an encrypted, HttpOnly session
                cookie. Log out at any time to end it.
              </p>
              <Button variant="outline" size="sm" className="mt-4 w-fit" onClick={refresh}>
                Refresh connection
              </Button>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
