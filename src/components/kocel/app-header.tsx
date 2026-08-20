import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";

import { BrandMark } from "@/components/kocel/brand-mark";
import { ConnectionStatusBadge } from "@/components/kocel/connection-status";
import { AccountTypeBadge, formatBalance } from "@/components/kocel/account-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ConnectionStatus } from "@/hooks/use-deriv-session";
import type { DerivAccount } from "@/lib/deriv-types";

const navItems = [
  { label: "Dashboard", to: "/dashboard" as const, available: true },
  { label: "Bots", to: "/dashboard" as const, available: false },
  { label: "Forex Scalper", to: "/dashboard" as const, available: false },
  { label: "Indices Scalper", to: "/dashboard" as const, available: false },
  { label: "Settings", to: "/dashboard" as const, available: false },
];

export function AppHeader({
  account,
  status,
  attempt,
  onLogout,
  loggingOut,
}: {
  account: DerivAccount | null;
  status: ConnectionStatus;
  attempt?: number | undefined;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetHeader className="border-b border-sidebar-border p-4">
                <SheetTitle className="text-left">
                  <BrandMark size="sm" />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3" aria-label="Main">
                {navItems.map((item) => (
                  <NavRow key={item.label} {...item} onNavigate={() => setOpen(false)} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/dashboard" className="rounded-md">
            <BrandMark size="sm" />
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Balance</p>
            <p className="font-mono text-sm text-foreground">{formatBalance(account)}</p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <AccountTypeBadge account={account} />
          </div>
          <ConnectionStatusBadge status={status} attempt={attempt} />
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Log out"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{loggingOut ? "Logging out..." : "Logout"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function NavRow({
  label,
  to,
  available,
  onNavigate,
}: {
  label: string;
  to: "/dashboard";
  available: boolean;
  onNavigate: () => void;
}) {
  if (!available) {
    return (
      <span className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground">
        {label}
        <span className="text-[10px] uppercase tracking-widest">Phase 2</span>
      </span>
    );
  }
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
    >
      {label}
    </Link>
  );
}

export function DesktopNav() {
  return (
    <nav
      aria-label="Sections"
      className="hidden w-56 shrink-0 flex-col gap-1 border-r border-border py-6 pr-4 lg:flex"
    >
      {navItems.map((item) =>
        item.available ? (
          <Link
            key={item.label}
            to={item.to}
            className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
            activeProps={{ className: "bg-accent text-accent-foreground" }}
          >
            {item.label}
          </Link>
        ) : (
          <span
            key={item.label}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground"
          >
            {item.label}
            <span className="text-[10px] uppercase tracking-widest">Phase 2</span>
          </span>
        ),
      )}
    </nav>
  );
}
