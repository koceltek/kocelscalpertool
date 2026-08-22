import type { ForexTradingRequest } from "./types";

export class ForexTradeReconciliationService {
  constructor(private readonly request: ForexTradingRequest) {}
  async portfolio() {
    const response = await this.request("portfolio", { portfolio: 1 });
    return Array.isArray(response["contracts"]) ? response["contracts"] : [];
  }
}
