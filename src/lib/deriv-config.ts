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

/** Must match EXACTLY a redirect URL registered in the Deriv app. */
export const DERIV_REDIRECT_URI =
  import.meta.env["VITE_DERIV_REDIRECT_URI"] ??
  "https://kocelscalpertool.lovable.app/oauth/callback";

export const DERIV_SCOPES = ["trade", "account_manage"] as const;

export const PKCE_VERIFIER_KEY = "kocel_pkce_code_verifier";
export const OAUTH_STATE_KEY = "kocel_oauth_state";
