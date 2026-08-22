import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requestSchema = z.object({
  operation: z.enum(["contracts_for", "proposal", "buy", "portfolio", "proposal_open_contract", "sell"]),
  payload: z.record(z.unknown()),
});

function publicError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Trading request failed.";
  throw new Error(message.includes("timed out") ? "Deriv request timed out." : "Deriv trading request failed.");
}

export const authenticatedTradingRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const { getKocelSession } = await import("./session.server");
    const session = await getKocelSession();
    const token = session.data.accessToken;
    if (!token || Date.now() >= (session.data.expiresAt ?? 0)) {
      if (token) await session.clear();
      throw new Error("Your Deriv session has expired.");
    }
    try {
      const { requestAuthenticatedDeriv } = await import("./deriv.server");
      const response = await requestAuthenticatedDeriv(token, data.payload);
      return { operation: data.operation, response };
    } catch (error) {
      publicError(error);
    }
  });
