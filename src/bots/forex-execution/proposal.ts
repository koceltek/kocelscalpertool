import type { ForexTradingRequest } from "./types";

const number = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const object = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export class ForexProposalEngine {
  constructor(private readonly request: ForexTradingRequest) {}
  async checkContracts(symbol: string) {
    return this.request("contracts_for", { contracts_for: symbol, currency: "" });
  }
  async requestProposal(input: {
    symbol: string;
    direction: "RISE" | "FALL";
    stake: number;
    currency: string;
    duration: number;
    durationUnit: string;
  }) {
    const contracts = await this.checkContracts(input.symbol);
    const available = JSON.stringify(contracts).toUpperCase();
    const contractType = (input.direction === "RISE" ? ["CALL", "RISE"] : ["PUT", "FALL"]).find(
      (type) => available.includes(type),
    );
    if (!contractType) throw new Error("INVALID_CONTRACT");
    return this.request("proposal", {
      proposal: 1,
      amount: input.stake,
      basis: "stake",
      contract_type: contractType,
      currency: input.currency,
      duration: input.duration,
      duration_unit: input.durationUnit,
      symbol: input.symbol,
    });
  }
  validate(
    response: Record<string, unknown>,
    input: {
      symbol: string;
      direction: "RISE" | "FALL";
      stake: number;
      currency: string;
      now?: number;
    },
  ) {
    const proposal = object(response.proposal);
    const id = proposal.id === undefined || proposal.id === null ? null : String(proposal.id);
    const askPrice = number(proposal.ask_price ?? proposal.display_value);
    const symbol = String(proposal.underlying ?? proposal.symbol ?? "");
    const currency = String(proposal.currency ?? "");
    const contractType = String(proposal.contract_type ?? proposal.longcode ?? "").toUpperCase();
    const expiresAt = number(proposal.date_expiry ?? proposal.expiry_time);
    const expected = input.direction === "RISE" ? ["CALL", "RISE"] : ["PUT", "FALL"];
    if (
      !id ||
      askPrice === null ||
      askPrice <= 0 ||
      symbol !== input.symbol ||
      currency !== input.currency ||
      askPrice > input.stake * 1.01 ||
      !expected.some((type) => contractType.includes(type))
    )
      throw new Error("PROPOSAL_REJECTED");
    if (expiresAt !== null && expiresAt * 1000 <= (input.now ?? Date.now()))
      throw new Error("PROPOSAL_EXPIRED");
    return { id, askPrice, payout: number(proposal.payout), expiresAt, contractType };
  }
}

export function normalizeContract(response: Record<string, unknown>) {
  const contract = object(response["proposal_open_contract"]);
  const status = String(contract["status"] ?? "").toLowerCase();
  const profit = number(contract["profit"]);
  const isClosed =
    Boolean(contract["is_sold"]) || ["won", "lost", "expired", "sold"].includes(status);
  return {
    status,
    profit,
    currentValue: number(contract["bid_price"] ?? contract["current_value"]),
    payout: number(contract["payout"]),
    currentSpot: number(contract["current_spot"]),
    exitSpot: number(contract["exit_spot"]),
    expiry: number(contract["expiry_time"]),
    isClosed,
    sellAvailable: Boolean(contract["is_valid_to_sell"] ?? contract["sell_available"]),
    result:
      status === "won"
        ? ("WIN" as const)
        : status === "lost" || status === "expired"
          ? ("LOSS" as const)
          : null,
  };
}
