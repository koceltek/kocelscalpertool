import type { ForexTradingRequest } from "./types";

export class ForexExitEngine {
  constructor(private readonly request: ForexTradingRequest) {}
  async sell(contractId: string) {
    if (!contractId) throw new Error("INVALID_CONTRACT");
    return this.request("sell", { sell: contractId, price: 0 });
  }
}
