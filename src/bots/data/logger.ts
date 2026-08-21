/**
 * Structured internal logging for the market-data engine.
 *
 * Logs are technical and intentionally never surfaced to normal users; the UI
 * only ever renders the simplified data-health status.
 */

export type DataLogLevel = "info" | "warn" | "error";

export type DataLogEntry = {
  at: number;
  level: DataLogLevel;
  scope: string;
  message: string;
  detail?: unknown;
};

const MAX_LOGS = 300;

class DataLogger {
  private entries: DataLogEntry[] = [];

  private push(level: DataLogLevel, scope: string, message: string, detail?: unknown) {
    const entry: DataLogEntry = { at: Date.now(), level, scope, message, ...(detail === undefined ? {} : { detail }) };
    this.entries.push(entry);
    if (this.entries.length > MAX_LOGS) this.entries.splice(0, this.entries.length - MAX_LOGS);
    if (import.meta.env.DEV) {
      const line = `[${scope}] ${message}`;
      if (level === "error") console.error(line, detail ?? "");
      else if (level === "warn") console.warn(line, detail ?? "");
      else console.info(line, detail ?? "");
    }
  }

  info(scope: string, message: string, detail?: unknown) {
    this.push("info", scope, message, detail);
  }

  warn(scope: string, message: string, detail?: unknown) {
    this.push("warn", scope, message, detail);
  }

  error(scope: string, message: string, detail?: unknown) {
    this.push("error", scope, message, detail);
  }

  /** Immutable copy — callers can never mutate the internal log. */
  recent(limit = 50): DataLogEntry[] {
    return this.entries.slice(-limit).map((e) => ({ ...e }));
  }
}

export const dataLogger = new DataLogger();
export const FOREX_DATA_SCOPE = "FOREX DATA";
