export type ForexTradingErrorCode =
  | "AUTH_ERROR"
  | "BALANCE_ERROR"
  | "MARKET_ERROR"
  | "PROPOSAL_ERROR"
  | "BUY_ERROR"
  | "SELL_ERROR"
  | "CONTRACT_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMIT_ERROR"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

const USER_MESSAGES: Record<ForexTradingErrorCode, string> = {
  AUTH_ERROR: "Please check your Deriv connection.",
  BALANCE_ERROR: "Unable to verify the Deriv account balance.",
  MARKET_ERROR: "The Forex market is currently unavailable.",
  PROPOSAL_ERROR: "Unable to prepare a valid trade proposal.",
  BUY_ERROR: "Unable to place the trade.",
  SELL_ERROR: "Unable to close the trade early.",
  CONTRACT_ERROR: "Unable to read the open contract.",
  NETWORK_ERROR: "Please check your Deriv connection.",
  RATE_LIMIT_ERROR: "Deriv is temporarily rate limiting requests.",
  TIMEOUT: "Deriv did not respond in time.",
  UNKNOWN_ERROR: "The Forex trade could not be completed.",
};

export class ForexTradingErrorManager {
  classify(error: unknown): ForexTradingErrorCode {
    const message = error instanceof Error ? error.message.toUpperCase() : "";
    if (message.includes("AUTH") || message.includes("SESSION")) return "AUTH_ERROR";
    if (message.includes("BALANCE")) return "BALANCE_ERROR";
    if (message.includes("TIMEOUT")) return "TIMEOUT";
    if (message.includes("NETWORK") || message.includes("SOCKET")) return "NETWORK_ERROR";
    if (message.includes("RATE")) return "RATE_LIMIT_ERROR";
    if (message.includes("PROPOSAL")) return "PROPOSAL_ERROR";
    if (message.includes("CONTRACT")) return "CONTRACT_ERROR";
    return "UNKNOWN_ERROR";
  }
  userMessage(error: unknown) {
    return USER_MESSAGES[this.classify(error)];
  }
}
