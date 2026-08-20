import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AuthState } from "./deriv-types";

import { isAllowedRedirectUri } from "./deriv-config";

const exchangeInput = z.object({
  code: z.string().min(1).max(4096),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z
    .string()
    .max(2048)
    .refine(isAllowedRedirectUri, "Unsupported redirect URI")
    .optional(),
});

/** Exchanges the single-use authorization code for a token, server-side. */
export const completeDerivLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => exchangeInput.parse(input))
  .handler(async ({ data }): Promise<AuthState> => {
    const { exchangeAuthorizationCode, fetchDerivAccounts } = await import(
      "./deriv.server"
    );
    const { getKocelSession } = await import("./session.server");

    const { accessToken, expiresAt } = await exchangeAuthorizationCode({
      code: data.code,
      codeVerifier: data.codeVerifier,
      redirectUri: data.redirectUri,
    });

    const accounts = await fetchDerivAccounts(accessToken);
    const primary = accounts[0] ?? null;

    const session = await getKocelSession();
    await session.update({
      accessToken,
      expiresAt,
      ...(primary ? { primaryAccountId: primary.accountId } : {}),
    });

    return {
      authenticated: true,
      account: primary,
      accounts,
      fetchedAt: Date.now(),
    };
  });

/** Returns the current authenticated state with LIVE account data. */
export const getAuthState = createServerFn({ method: "POST" }).handler(
  async (): Promise<AuthState> => {
    const { getKocelSession } = await import("./session.server");
    const session = await getKocelSession();
    const token = session.data.accessToken;
    const expiresAt = session.data.expiresAt ?? 0;

    if (!token || Date.now() >= expiresAt) {
      if (token) await session.clear();
      return { authenticated: false, account: null, accounts: [], fetchedAt: Date.now() };
    }

    const { fetchDerivAccounts, DerivError } = await import("./deriv.server");
    try {
      const accounts = await fetchDerivAccounts(token);
      const primary =
        accounts.find((a) => a.accountId === session.data.primaryAccountId) ??
        accounts[0] ??
        null;
      return {
        authenticated: true,
        account: primary,
        accounts,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      if (error instanceof DerivError && error.code === "SESSION_EXPIRED") {
        await session.clear();
        return { authenticated: false, account: null, accounts: [], fetchedAt: Date.now() };
      }
      throw error;
    }
  },
);

/** Switches the active (primary) account for the current session. */
export const setActiveDerivAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ accountId: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data }): Promise<AuthState> => {
    const { getKocelSession } = await import("./session.server");
    const session = await getKocelSession();
    const token = session.data.accessToken;
    const expiresAt = session.data.expiresAt ?? 0;

    if (!token || Date.now() >= expiresAt) {
      if (token) await session.clear();
      return { authenticated: false, account: null, accounts: [], fetchedAt: Date.now() };
    }

    const { fetchDerivAccounts } = await import("./deriv.server");
    const accounts = await fetchDerivAccounts(token);
    const selected = accounts.find((a) => a.accountId === data.accountId);
    if (!selected) {
      throw new Error("Account not available for this session");
    }

    await session.update({ primaryAccountId: selected.accountId });

    return {
      authenticated: true,
      account: selected,
      accounts,
      fetchedAt: Date.now(),
    };
  });

export const logoutDeriv = createServerFn({ method: "POST" }).handler(async () => {
  const { getKocelSession } = await import("./session.server");
  const session = await getKocelSession();
  await session.clear();
  return { ok: true };
});
