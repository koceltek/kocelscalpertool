/** Client-safe shared types for the Deriv integration. */

export type AccountType = "DEMO" | "REAL" | "UNKNOWN";

export type DerivAccount = {
  accountId: string;
  accountType: AccountType;
  currency: string | null;
  balance: number | null;
  balanceAvailable: boolean;
};

export type AuthState = {
  authenticated: boolean;
  account: DerivAccount | null;
  accounts: DerivAccount[];
  fetchedAt: number;
};

export type AppError = {
  code: "AUTH_FAILED" | "API_ERROR" | "SESSION_EXPIRED" | "CANCELLED" | "STATE_MISMATCH";
  message: string;
};

export const ERROR_MESSAGES: Record<AppError["code"], string> = {
  AUTH_FAILED: "Unable to authenticate with Deriv. Please try again.",
  API_ERROR: "Deriv connection error. Please try again.",
  SESSION_EXPIRED: "Your session has expired. Please reconnect your Deriv account.",
  CANCELLED: "Authentication was cancelled. You can try again when ready.",
  STATE_MISMATCH: "Authentication response could not be verified. Please try again.",
};
