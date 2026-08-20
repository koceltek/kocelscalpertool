import { createFileRoute } from "@tanstack/react-router";

import { BotShell } from "@/components/bots/bot-shell";

export const Route = createFileRoute("/bots/indices")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Indices Scalper Bot — Kocel Rise & Fall" },
      {
        name: "description",
        content:
          "Synthetic indices Rise & Fall scalping workspace: tick momentum, velocity, directional pressure and exhaustion on Volatility 10, 25 and 50.",
      },
      { property: "og:title", content: "Kocel Indices Scalper Bot" },
      {
        property: "og:description",
        content: "Configure and monitor the Kocel synthetic indices Rise & Fall scalper.",
      },
    ],
  }),
  component: IndicesLayout,
});

function IndicesLayout() {
  return (
    <BotShell
      botType="indices"
      tagline="Synthetic volatility indices · tick-level momentum and exhaustion analysis"
    />
  );
}
