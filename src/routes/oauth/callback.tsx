import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/kocel/brand-mark";
import { ErrorAlert } from "@/components/kocel/error-alert";
import { LoadingSpinner } from "@/components/kocel/loading-spinner";
import { Button } from "@/components/ui/button";
import { authStateQueryKey } from "@/hooks/use-deriv-session";
import { completeDerivLogin } from "@/lib/auth.functions";
import { getRedirectUri, OAUTH_STATE_KEY, PKCE_VERIFIER_KEY, REDIRECT_URI_KEY } from "@/lib/deriv-config";
import { ERROR_MESSAGES, type AppError } from "@/lib/deriv-types";

export const Route = createFileRoute("/oauth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Completing sign in — Kocel Rise & Fall Bot" },
      {
        name: "description",
        content: "Finishing the secure Deriv authentication for Kocel Rise & Fall Bot.",
      },
      { property: "og:title", content: "Completing sign in — Kocel" },
      {
        property: "og:description",
        content: "Finishing the secure Deriv authentication for Kocel Rise & Fall Bot.",
      },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const exchange = useServerFn(completeDerivLogin);
  const started = useRef(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
    const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    const clearPkce = () => {
      sessionStorage.removeItem(PKCE_VERIFIER_KEY);
      sessionStorage.removeItem(OAUTH_STATE_KEY);
      sessionStorage.removeItem(REDIRECT_URI_KEY);
    };

    const errParam = params.get("error");
    if (errParam) {
      clearPkce();
      setError(
        errParam === "access_denied"
          ? { code: "CANCELLED", message: ERROR_MESSAGES.CANCELLED }
          : { code: "AUTH_FAILED", message: ERROR_MESSAGES.AUTH_FAILED },
      );
      return;
    }

    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state || !storedState || state !== storedState || !verifier) {
      clearPkce();
      setError({ code: "STATE_MISMATCH", message: ERROR_MESSAGES.STATE_MISMATCH });
      return;
    }

    void (async () => {
      try {
        const redirectUri = sessionStorage.getItem(REDIRECT_URI_KEY) ?? getRedirectUri();
        const result = await exchange({
          data: { code, codeVerifier: verifier, redirectUri },
        });
        clearPkce();
        queryClient.setQueryData(authStateQueryKey, result);
        navigate({ to: "/dashboard", replace: true });
      } catch {
        clearPkce();
        setError({ code: "AUTH_FAILED", message: ERROR_MESSAGES.AUTH_FAILED });
      }
    })();
  }, [exchange, navigate, queryClient]);

  return (
    <main className="grid-backdrop grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <BrandMark size="md" />
        </div>
        <div className="mt-8 rounded-2xl border border-border bg-card/80 p-6 backdrop-blur">
          {error ? (
            <>
              <ErrorAlert title="Sign in could not be completed" message={error.message} />
              <Button
                className="mt-5 w-full"
                onClick={() => navigate({ to: "/", replace: true })}
              >
                Back to login
              </Button>
            </>
          ) : (
            <div className="flex justify-center py-4">
              <LoadingSpinner label="Connecting to Deriv..." />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
