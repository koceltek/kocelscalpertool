/**
 * Public (non-secret) Deriv OAuth configuration.
 *
 * The OAuth 2.0 + PKCE flow used here is a *public client* flow: there is no
 * client secret. Security comes from PKCE (code_verifier / code_challenge) and
 * the `state` CSRF parameter. The authorization code is exchanged for an access
 * token on the SERVER only (see src/lib/deriv.server.ts), and the resulting
 * token is stored in an encrypted, HttpOnly session cookie — never in the
 * browser.
 */

export const DERIV_AUTH_URL = "https://auth.deriv.com/oauth2/auth";
export const DERIV_TOKEN_URL = "https://auth.deriv.com/oauth2/token";
export const DERIV_API_BASE_URL = "https://api.derivws.com";

/** Registered OAuth2 client id (public value). */
export const DERIV_CLIENT_ID =
  import.meta.env["VITE_DERIV_CLIENT_ID"] ?? "34az2gX5h2arQ46I58tEI";

/** Registered production redirect URL (fallback when no origin is known). */
export const DERIV_REDIRECT_URI =
  import.meta.env["VITE_DERIV_REDIRECT_URI"] ??
  "https://kocelscalpertool.lovable.app/oauth/callback";

export const OAUTH_CALLBACK_PATH = "/oauth/callback";

/**
 * The redirect URL to send to Deriv.
 *
 * Prefers the explicit VITE_DERIV_REDIRECT_URI override, otherwise uses the
 * current origin so preview / localhost logins come back to the same host
 * instead of bouncing to production. Every origin used here must also be
 * registered on the Deriv app.
 */
export function getRedirectUri(): string {
  const override = import.meta.env["VITE_DERIV_REDIRECT_URI"];
  if (override) return override;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${OAUTH_CALLBACK_PATH}`;
  }
  return DERIV_REDIRECT_URI;
}

/** Server-side allowlist check for a client-supplied redirect URI. */
export function isAllowedRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.pathname !== OAUTH_CALLBACK_PATH) return false;
    if (url.search || url.hash) return false;
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) return false;
    return isLocal || url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovableproject.com");
  } catch {
    return false;
  }
}

export const REDIRECT_URI_KEY = "kocel_oauth_redirect_uri";

export const DERIV_SCOPES = ["trade", "account_manage"] as const;

export const PKCE_VERIFIER_KEY = "kocel_pkce_code_verifier";
export const OAUTH_STATE_KEY = "kocel_oauth_state";
