import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: () => { throw redirect({ to: "/bots/indices/trade" }); },
});
