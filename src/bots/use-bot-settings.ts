import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { BotType } from "./contracts";
import {
  botSettingsSchema,
  defaultSettings,
  loadSettings,
  persistSettings,
  type BotSettings,
} from "./settings";

/** Bot-scoped settings state. Each bot type gets its own isolated record. */
export function useBotSettings(botType: BotType) {
  const [settings, setSettings] = useState<BotSettings>(() => defaultSettings(botType));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings(botType));
    setHydrated(true);
  }, [botType]);

  const save = useCallback(
    (next: BotSettings) => {
      const parsed = botSettingsSchema.safeParse(next);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Settings are not valid");
        return false;
      }
      setSettings(parsed.data);
      persistSettings(botType, parsed.data);
      return true;
    },
    [botType],
  );

  /** Updates in-memory state without persisting (used while editing). */
  const update = useCallback((patch: Partial<BotSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    const next = defaultSettings(botType);
    setSettings(next);
    persistSettings(botType, next);
  }, [botType]);

  return { settings, hydrated, save, update, reset };
}
