import { createFileRoute, redirect } from "@tanstack/react-router";

/** The bot has no overview screen — /bots/forex lands on the trading control. */
export const Route = createFileRoute("/bots/forex/")({
  beforeLoad: () => {
    throw redirect({ to: "/bots/forex/trade", replace: true });
  },
});
