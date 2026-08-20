/** Encrypted, HttpOnly cookie session (server-only). */
import { useSession } from "@tanstack/react-start/server";

export type KocelSession = {
  accessToken?: string;
  expiresAt?: number;
  primaryAccountId?: string;
};

function getSessionConfig() {
  const password = process.env["KOCEL_SESSION_SECRET"];
  if (!password) throw new Error("KOCEL_SESSION_SECRET is not configured");
  return {
    password,
    name: "kocel_session",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: true,
      path: "/",
    },
  };
}

export function getKocelSession() {
  return useSession<KocelSession>(getSessionConfig());
}
