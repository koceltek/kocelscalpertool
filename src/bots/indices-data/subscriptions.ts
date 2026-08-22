export class IndicesSubscriptionManager {
  private subscriptions = new Map<string, string>();

  has(symbol: string) { return this.subscriptions.has(symbol); }
  get(symbol: string) { return this.subscriptions.get(symbol) ?? null; }
  track(symbol: string, subscriptionId: string | null) { if (subscriptionId) this.subscriptions.set(symbol, subscriptionId); }
  forget(symbol: string) { const id = this.subscriptions.get(symbol) ?? null; this.subscriptions.delete(symbol); return id; }
  entries() { return [...this.subscriptions.entries()]; }
  clear() { const entries = this.entries(); this.subscriptions.clear(); return entries; }
}
