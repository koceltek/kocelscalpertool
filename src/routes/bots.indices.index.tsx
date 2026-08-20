import { createFileRoute, redirect } from "@tanstack/react-router";

/** The bot has no overview screen — /bots/indices lands on the trading control. */
export const Route = createFileRoute("/bots/indices/")({
  beforeLoad: () => {
    throw redirect({ to: "/bots/indices/trade", replace: true });
  },
});
