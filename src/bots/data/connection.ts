import {
  DERIV_APP_ID,
  DERIV_WS_URL,
  RECONNECT_BACKOFF_MS,
  REQUEST_TIMEOUT_MS,
  STABLE_CONNECTION_MS,
} from "./config";
import { MARKET_DATA_SCOPE, dataLogger } from "./logger";

type Json = Record<string, unknown>;

type Pending = {
  resolve: (value: Json) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type ConnectionHealth = {
  connected: boolean;
  lastMessageTime: number | null;
  reconnectAttempts: number;
};

/**
 * Single, controlled WebSocket to Deriv's public market-data API.
 *
 * Deliberately framework-agnostic and instantiated once by the data service, so
 * React re-renders can never open extra sockets. Completely separate from the
 * Phase 1 authenticated account session.
 */
export class DerivMarketDataConnection {
  private socket: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private streamHandlers = new Set<(message: Json) => void>();
  private stateHandlers = new Set<(connected: boolean, reason?: string) => void>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stableTimer: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;
  private connectPromise: Promise<void> | null = null;

  reconnectAttempts = 0;
  lastMessageTime: number | null = null;

  get connected() {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  onStream(handler: (message: Json) => void) {
    this.streamHandlers.add(handler);
    return () => this.streamHandlers.delete(handler);
  }

  onStateChange(handler: (connected: boolean, reason?: string) => void) {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  connect(): Promise<void> {
    if (this.connected) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    this.manualClose = false;
    dataLogger.info(MARKET_DATA_SCOPE, "Connecting...");

    this.connectPromise = new Promise<void>((resolve, reject) => {
      let socket: WebSocket;
      try {
        socket = new WebSocket(`${DERIV_WS_URL}?app_id=${encodeURIComponent(DERIV_APP_ID)}`);
      } catch (error) {
        this.connectPromise = null;
        reject(error instanceof Error ? error : new Error("Socket creation failed"));
        return;
      }
      this.socket = socket;

      socket.onopen = () => {
        this.connectPromise = null;
        dataLogger.info(MARKET_DATA_SCOPE, "Market data connection established");
        this.stableTimer = setTimeout(() => {
          this.reconnectAttempts = 0;
        }, STABLE_CONNECTION_MS);
        this.emitState(true);
        resolve();
      };

      socket.onmessage = (event) => {
        this.lastMessageTime = Date.now();
        let message: Json;
        try {
          message = JSON.parse(String(event.data)) as Json;
        } catch (error) {
          dataLogger.warn(MARKET_DATA_SCOPE, "Unparsable market data message", error);
          return;
        }
        this.handleMessage(message);
      };

      socket.onerror = () => {
        dataLogger.error(MARKET_DATA_SCOPE, "Market data socket error");
      };

      socket.onclose = (event) => {
        const wasConnecting = this.connectPromise !== null;
        this.connectPromise = null;
        this.socket = null;
        this.clearStableTimer();
        this.failAllPending("Market data connection closed");
        dataLogger.warn(MARKET_DATA_SCOPE, `Connection closed (code ${event.code})`);
        this.emitState(false, this.manualClose ? "stopped" : "closed");
        if (wasConnecting) reject(new Error("Market data connection closed"));
        if (!this.manualClose) this.scheduleReconnect();
      };
    });

    return this.connectPromise;
  }

  private handleMessage(message: Json) {
    const reqId = typeof message["req_id"] === "number" ? (message["req_id"] as number) : null;
    const isStream = typeof message["subscription"] === "object" && message["subscription"] !== null;

    if (reqId !== null && this.pending.has(reqId)) {
      const pending = this.pending.get(reqId)!;
      // Streamed updates keep arriving on the same req_id; resolve once only.
      clearTimeout(pending.timer);
      this.pending.delete(reqId);
      const error = message["error"] as { message?: string; code?: string } | undefined;
      if (error) pending.reject(new Error(error.message ?? error.code ?? "Deriv API error"));
      else pending.resolve(message);
      if (!isStream) return;
    }

    for (const handler of this.streamHandlers) {
      try {
        handler(message);
      } catch (error) {
        dataLogger.error(MARKET_DATA_SCOPE, "Stream handler failed", error);
      }
    }
  }

  /** Request/response call. Streams also deliver later updates via onStream. */
  async send(payload: Json): Promise<Json> {
    await this.connect();
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Market data connection unavailable");
    }
    const reqId = this.nextId++;
    return new Promise<Json>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error("Market data request timed out"));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(reqId, { resolve, reject, timer });
      socket.send(JSON.stringify({ ...payload, req_id: reqId }));
    });
  }

  /** Fire-and-forget (used for forget / forget_all on shutdown). */
  sendRaw(payload: Json) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const index = Math.min(this.reconnectAttempts, RECONNECT_BACKOFF_MS.length - 1);
    const delay = RECONNECT_BACKOFF_MS[index]!;
    this.reconnectAttempts += 1;
    dataLogger.info(
      MARKET_DATA_SCOPE,
      `Reconnect attempt ${this.reconnectAttempts} scheduled in ${delay}ms`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.manualClose) return;
      void this.connect().catch(() => {
        /* onclose schedules the next attempt */
      });
    }, delay);
  }

  private clearStableTimer() {
    if (this.stableTimer) {
      clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }
  }

  private failAllPending(reason: string) {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
  }

  private emitState(connected: boolean, reason?: string) {
    for (const handler of this.stateHandlers) {
      try {
        handler(connected, reason);
      } catch (error) {
        dataLogger.error(MARKET_DATA_SCOPE, "State handler failed", error);
      }
    }
  }

  close() {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearStableTimer();
    this.failAllPending("Market data connection stopped");
    this.reconnectAttempts = 0;
    const socket = this.socket;
    this.socket = null;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    }
    this.emitState(false, "stopped");
  }

  health(): ConnectionHealth {
    return {
      connected: this.connected,
      lastMessageTime: this.lastMessageTime,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}
