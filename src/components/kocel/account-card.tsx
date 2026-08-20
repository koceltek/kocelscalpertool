import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/kocel/status-badge";
import { ConnectionStatusBadge } from "@/components/kocel/connection-status";
import type { ConnectionStatus } from "@/hooks/use-deriv-session";
import type { DerivAccount } from "@/lib/deriv-types";

export function formatBalance(account: DerivAccount | null): string {
  if (!account || !account.balanceAvailable || account.balance === null) {
    return "Not available";
  }
  const currency = account.currency ?? "";
  const amount = account.balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${amount} ${currency}` : amount;
}

export function AccountTypeBadge({ account }: { account: DerivAccount | null }) {
  if (!account || account.accountType === "UNKNOWN") {
    return <StatusBadge tone="neutral" symbol="?" label="Type not available" />;
  }
  return account.accountType === "DEMO" ? (
    <StatusBadge tone="warning" symbol="◆" label="Demo account" />
  ) : (
    <StatusBadge tone="success" symbol="◆" label="Real account" />
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-base text-foreground sm:text-lg">{value}</p>
    </div>
  );
}

export function AccountCard({
  account,
  status,
  attempt,
}: {
  account: DerivAccount | null;
  status: ConnectionStatus;
  attempt?: number;
}) {
  return (
    <Card className="gap-5 border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Account
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <AccountTypeBadge account={account} />
          <ConnectionStatusBadge status={status} attempt={attempt} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Balance" value={formatBalance(account)} />
        <Field label="Account ID" value={account?.accountId ?? "Not available"} />
        <Field label="Currency" value={account?.currency ?? "Not available"} />
      </div>
    </Card>
  );
}
