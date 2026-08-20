import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authStateQueryKey } from "@/hooks/use-deriv-session";
import { setActiveDerivAccount } from "@/lib/auth.functions";
import type { AuthState, DerivAccount } from "@/lib/deriv-types";

function accountLabel(account: DerivAccount): string {
  const kind =
    account.accountType === "DEMO"
      ? "Demo"
      : account.accountType === "REAL"
        ? "Real"
        : "Account";
  return `${kind} · ${account.accountId}`;
}

function accountBalance(account: DerivAccount): string {
  if (!account.balanceAvailable || account.balance === null) return "—";
  const amount = account.balance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return account.currency ? `${amount} ${account.currency}` : amount;
}

/** Lets a user with multiple Deriv accounts choose the active demo/real account. */
export function AccountSwitcher({
  accounts,
  active,
}: {
  accounts: DerivAccount[];
  active: DerivAccount | null;
}) {
  const queryClient = useQueryClient();
  const switchAccount = useServerFn(setActiveDerivAccount);

  const mutation = useMutation({
    mutationFn: (accountId: string) => switchAccount({ data: { accountId } }),
    onSuccess: (next: AuthState) => {
      queryClient.setQueryData(authStateQueryKey, next);
      void queryClient.invalidateQueries({ queryKey: authStateQueryKey });
      if (next.account) {
        toast.success(`Switched to ${accountLabel(next.account)}`);
      }
    },
    onError: () => toast.error("Could not switch account. Please try again."),
  });

  if (accounts.length < 2) return null;

  const demo = accounts.filter((a) => a.accountType === "DEMO");
  const real = accounts.filter((a) => a.accountType !== "DEMO");

  const renderGroup = (label: string, list: DerivAccount[]) =>
    list.length ? (
      <>
        <DropdownMenuLabel className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        {list.map((account) => (
          <DropdownMenuItem
            key={account.accountId}
            onSelect={() => {
              if (account.accountId !== active?.accountId) {
                mutation.mutate(account.accountId);
              }
            }}
            className="flex items-center justify-between gap-4"
          >
            <span className="font-mono text-xs">{account.accountId}</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {accountBalance(account)}
              {account.accountId === active?.accountId ? (
                <Check className="size-3.5 text-success" aria-hidden="true" />
              ) : null}
            </span>
          </DropdownMenuItem>
        ))}
      </>
    ) : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          aria-label="Switch Deriv account"
        >
          <span className="max-w-[10rem] truncate">
            {mutation.isPending
              ? "Switching..."
              : active
                ? accountLabel(active)
                : "Select account"}
          </span>
          <ChevronDown className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {renderGroup("Real accounts", real)}
        {real.length && demo.length ? <DropdownMenuSeparator /> : null}
        {renderGroup("Demo accounts", demo)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
