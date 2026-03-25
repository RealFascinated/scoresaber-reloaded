import WebSocket from "ws";
import Logger from "../logger";

const RECONNECT_DELAY_MS = 5000;

/** Optional details when a socket `error` event fired before `close` on the same connection. */
export type WebsocketDisconnectContext = {
  precedingSocketError?: Error;
};

export type WebsocketCallbacks = {
  /**
   * Invoked when a general message is received.
   *
   * @param message the received message.
   */
  onMessage?: (message: unknown) => void;

  /**
   * Invoked once when the connection closes (after `error`, if any, on the same socket).
   * This is only called from the `close` handler so it never runs twice for one disconnect.
   *
   * @param close the WebSocket close event.
   * @param context when present, `precedingSocketError` was set by a prior `error` on this socket.
   */
  onDisconnect?: (close: WebSocket.CloseEvent, context?: WebsocketDisconnectContext) => void;
};

type Websocket = {
  /**
   * The name of the service we're connecting to.
   */
  name: string;

  /**
   * The url of the service we're connecting to.
   */
  url: string;
} & WebsocketCallbacks;

function formatCloseReason(reason: unknown): string {
  if (typeof reason === "string") return reason;
  if (Buffer.isBuffer(reason)) return reason.toString("utf8");
  return "";
}

/**
 * Connects to a WebSocket URL, parses JSON messages, and reconnects after disconnect.
 */
export function connectWebSocket({ name, url, onMessage, onDisconnect }: Websocket) {
  let reconnectTimer: NodeJS.Timeout | undefined;

  function connectWs() {
    let precedingSocketError: Error | undefined;

    const websocket = new WebSocket(url);

    websocket.onopen = () => {
      precedingSocketError = undefined;
      Logger.info(`Connected to the ${name} WebSocket!`);
    };

    websocket.onerror = event => {
      const raw = event.error;
      precedingSocketError =
        raw instanceof Error
          ? raw
          : typeof raw === "string"
            ? new Error(raw)
            : new Error(event.message || "WebSocket error");
      Logger.error(`WebSocket error (${name}):`, precedingSocketError);
      // Do not call onDisconnect here — `close` always follows and is the single notification path.
    };

    websocket.onclose = event => {
      const reasonText = formatCloseReason(event.reason);
      const reasonLog = reasonText ? reasonText : "(none)";
      const errHint = precedingSocketError ? ` Preceding error: ${precedingSocketError.message}` : "";

      Logger.info(
        `Lost connection to the ${name} WebSocket (code=${event.code}, reason=${reasonLog}, wasClean=${event.wasClean}).${errHint} Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`
      );

      const context: WebsocketDisconnectContext | undefined = precedingSocketError
        ? { precedingSocketError }
        : undefined;
      onDisconnect?.(event, context);

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      reconnectTimer = setTimeout(connectWs, RECONNECT_DELAY_MS);
    };

    websocket.onmessage = messageEvent => {
      if (typeof messageEvent.data !== "string") return;

      try {
        const command = JSON.parse(messageEvent.data);
        onMessage && onMessage(command);
      } catch (err) {
        Logger.warn(`Received invalid json message on ${name}:`, messageEvent.data);
      }
    };
  }

  connectWs(); // Initiate the first connection
}
