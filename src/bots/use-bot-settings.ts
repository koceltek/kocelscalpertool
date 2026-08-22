import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  botSettingsSchema,
  defaultSettings,
  loadSettings,
  persistSettings,
  type BotSettings,
} from "./settings";

/** Bot-scoped settings state. Each bot type gets its own isolated record. */
export function useBotSettings() {
  const [settings, setSettings] = useState<BotSettings>(() => defaultSettings());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  const save = useCallback(
    (next: BotSettings) => {
      const parsed = botSettingsSchema.safeParse(next);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Settings are not valid");
        return false;
      }
      setSettings(parsed.data);
      persistSettings(parsed.data);
      return true;
    },
    [],
  );

  /** Updates in-memory state without persisting (used while editing). */
  const update = useCallback((patch: Partial<BotSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    const next = defaultSettings();
    setSettings(next);
    persistSettings(next);
  }, []);

  return { settings, hydrated, save, update, reset };
}
