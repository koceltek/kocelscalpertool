/**
 * Server-only Deriv integration: token exchange + authenticated API reads.
 * Never imported by client code.
 */
import {
  DERIV_API_BASE_URL,
  DERIV_CLIENT_ID,
  DERIV_REDIRECT_URI,
  DERIV_TOKEN_URL,
} from "./deriv-config";

import type { DerivAccount } from "./deriv-types";

export type { DerivAccount };

export class DerivError extends Error {
  code: "AUTH_FAILED" | "API_ERROR" | "SESSION_EXPIRED";
  constructor(code: DerivError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; expiresAt: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: DERIV_CLIENT_ID,
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: DERIV_REDIRECT_URI,
  });

  const res = await fetch(DERIV_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    // Log safely for debugging: status only, never the code/verifier/token.
    console.error("Deriv token exchange failed", res.status);
    throw new DerivError("AUTH_FAILED", "Unable to authenticate with Deriv.");
  }

  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new DerivError("AUTH_FAILED", "Unable to authenticate with Deriv.");
  }

  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function normalizeAccount(raw: Record<string, unknown>): DerivAccount {
  const accountId = String(
    pick(raw, ["account_id", "loginid", "loginId", "id", "code"]) ?? "",
  );

  const typeHint = pick(raw, [
    "is_virtual",
    "account_type",
    "type",
    "account_category",
  ]);
  let accountType: DerivAccount["accountType"] = "UNKNOWN";
  if (typeof typeHint === "boolean") {
    accountType = typeHint ? "DEMO" : "REAL";
  } else if (typeof typeHint === "number") {
    accountType = typeHint === 1 ? "DEMO" : "REAL";
  } else if (typeof typeHint === "string") {
    const t = typeHint.toLowerCase();
    if (t.includes("virtual") || t.includes("demo")) accountType = "DEMO";
    else if (t.includes("real") || t.includes("trading")) accountType = "REAL";
  }
  if (accountType === "UNKNOWN" && accountId) {
    if (accountId.toUpperCase().startsWith("VR")) accountType = "DEMO";
    else if (/^[A-Z]{2}\d/.test(accountId.toUpperCase())) accountType = "REAL";
  }

  const rawBalance = pick(raw, ["balance", "available_balance", "amount"]);
  const balanceValue =
    typeof rawBalance === "object" && rawBalance !== null
      ? pick(rawBalance as Record<string, unknown>, ["balance", "amount", "value"])
      : rawBalance;
  const balance =
    balanceValue === undefined || balanceValue === null
      ? null
      : Number(balanceValue);

  const currencyValue = pick(raw, ["currency", "currency_code"]);

  return {
    accountId: accountId || "Not available",
    accountType,
    currency: typeof currencyValue === "string" ? currencyValue : null,
    balance: balance !== null && Number.isFinite(balance) ? balance : null,
    balanceAvailable: balance !== null && Number.isFinite(balance),
  };
}

/** Reads the authorized accounts (and live balances) for an access token. */
export async function fetchDerivAccounts(
  accessToken: string,
): Promise<DerivAccount[]> {
  const res = await fetch(
    `${DERIV_API_BASE_URL}/trading/v1/options/accounts`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (res.status === 401 || res.status === 403) {
    throw new DerivError("SESSION_EXPIRED", "Your session has expired.");
  }
  if (!res.ok) {
    console.error("Deriv accounts request failed", res.status);
    throw new DerivError("API_ERROR", "Deriv connection error.");
  }

  const json: unknown = await res.json();
  const list = Array.isArray(json)
    ? json
    : Array.isArray((json as { accounts?: unknown[] })?.accounts)
      ? (json as { accounts: unknown[] }).accounts
      : Array.isArray((json as { data?: unknown[] })?.data)
        ? (json as { data: unknown[] }).data
        : [];

  return list
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map(normalizeAccount);
}
