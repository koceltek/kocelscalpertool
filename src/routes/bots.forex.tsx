import { createFileRoute } from "@tanstack/react-router";

import { BotShell } from "@/components/bots/bot-shell";

export const Route = createFileRoute("/bots/forex")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forex Scalper Bot — Kocel Rise & Fall" },
      {
        name: "description",
        content:
          "Forex Rise & Fall scalping workspace: trend, momentum, volatility and structure analysis for EUR/USD, USD/JPY and GBP/USD.",
      },
      { property: "og:title", content: "Kocel Forex Scalper Bot" },
      {
        property: "og:description",
        content: "Configure and monitor the Kocel Forex Rise & Fall scalper.",
      },
    ],
  }),
  component: ForexLayout,
});

function ForexLayout() {
  return (
    <BotShell
      botType="forex"
      tagline="Major currency pairs · trend, momentum, volatility and structure confirmation"
    />
  );
}
