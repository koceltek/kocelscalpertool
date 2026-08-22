import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/kocel/brand-mark";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { Button } from "@/components/ui/button";
import {
  DERIV_AUTH_URL,
  DERIV_CLIENT_ID,
  DERIV_SCOPES,
  getRedirectUri,
  OAUTH_STATE_KEY,
  PKCE_VERIFIER_KEY,
  REDIRECT_URI_KEY,
} from "@/lib/deriv-config";
import { ERROR_MESSAGES, type AppError } from "@/lib/deriv-types";
import { deriveCodeChallenge, generateCodeVerifier, generateState } from "@/lib/pkce";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kocel Rise & Fall Bot — Connect your Deriv account" },
      {
        name: "description",
        content:
          "Kocel Rise & Fall Bot is a professional Rise/Fall scalping platform. Sign in securely with your Deriv account to get started.",
      },
      { property: "og:title", content: "Kocel Rise & Fall Bot" },
      {
        property: "og:description",
        content:
          "Connect your Deriv account securely to access Kocel's Rise/Fall scalping workspace.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "expired") {
      setError({ code: "SESSION_EXPIRED", message: ERROR_MESSAGES.SESSION_EXPIRED });
    } else if (reason === "auth_failed") {
      setError({ code: "AUTH_FAILED", message: ERROR_MESSAGES.AUTH_FAILED });
    }
  }, []);

  async function startLogin() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const verifier = generateCodeVerifier();
      const challenge = await deriveCodeChallenge(verifier);
      const state = generateState();

      sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
      sessionStorage.setItem(OAUTH_STATE_KEY, state);
      const redirectUri = getRedirectUri();
      sessionStorage.setItem(REDIRECT_URI_KEY, redirectUri);

      const url = new URL(DERIV_AUTH_URL);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", DERIV_CLIENT_ID);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", DERIV_SCOPES.join(" "));
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge);
      url.searchParams.set("code_challenge_method", "S256");

      window.location.assign(url.toString());
    } catch {
      setPending(false);
      setError({ code: "AUTH_FAILED", message: ERROR_MESSAGES.AUTH_FAILED });
    }
  }

  return (
    <main className="grid-backdrop flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <BrandMark size="lg" />
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <h1 className="text-center text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            Trade smarter. Scalp with precision.
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
            Kocel connects securely to your Deriv account and will give you access to the
            Indices Rise/Fall scalping bot. Trading
            involves risk — no outcome is guaranteed.
          </p>

          {error ? (
            <ErrorAlert
              className="mt-6"
              title="Authentication issue"
              message={error.message}
            />
          ) : null}

          <Button
            className="mt-7 h-12 w-full text-base font-semibold"
            onClick={startLogin}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Connecting to Deriv..." : "Login with Deriv"}
            {!pending ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
          </Button>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Secure OAuth 2.0 authentication via Deriv. Kocel never sees your password.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/bots/indices/trade" })}
          className="mx-auto mt-6 block text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Already connected? Open dashboard
        </button>
      </div>
    </main>
  );
}
