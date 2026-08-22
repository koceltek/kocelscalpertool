import type { ForexTradingRequest, NormalizedContract } from "./types";
import { normalizeContract } from "./proposal";

export class ForexContractMonitor {
  constructor(private readonly request: ForexTradingRequest) {}
  async read(contractId: string): Promise<NormalizedContract> {
    const response = await this.request("proposal_open_contract", {
      proposal_open_contract: 1,
      contract_id: contractId,
    });
    return normalizeContract(response);
  }
}
