import WebSocket from "ws";
import { DiscordChannels, logToChannel } from "backend/src/bot/bot";
import { EmbedBuilder } from "discord.js";

export type WebsocketCallbacks = {
  /**
   * Invoked when a general message is received.
   *
   * @param message the received message.
   */
  onMessage?: (message: unknown) => void;

  /**
   * Invoked when the connection is closed.
   *
   * @param error the error that caused the connection to close
   */
  onDisconnect?: (error?: WebSocket.ErrorEvent | WebSocket.CloseEvent) => void;
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

/**
 * Connects to the ScoreSaber websocket and handles incoming messages.
 */
export function connectWebSocket({ name, url, onMessage, onDisconnect }: Websocket) {
  let websocket: WebSocket | null = null;

  /**
   * Logs to the backend logs channel.
   *
   * @param error the error to log
   */
  async function log(error: WebSocket.ErrorEvent | WebSocket.CloseEvent) {
    await logToChannel(
      DiscordChannels.backendLogs,
      new EmbedBuilder().setDescription(`${name} websocket disconnected: ${JSON.stringify(error)}`)
    );
  }

  function connectWs() {
    websocket = new WebSocket(url);

    websocket.onopen = () => {
      console.log(`Connected to the ${name} WebSocket!`);
    };

    websocket.onerror = event => {
      console.error("WebSocket Error:", event);
      if (websocket) {
        websocket.close(); // Close the connection on error
      }

      onDisconnect && onDisconnect(event);
      log(event);
    };

    websocket.onclose = event => {
      console.log(`Lost connection to the ${name} WebSocket. Attempting to reconnect...`);

      onDisconnect && onDisconnect(event);
      log(event);
      setTimeout(connectWs, 5000); // Reconnect after 5 seconds
    };

    websocket.onmessage = messageEvent => {
      if (typeof messageEvent.data !== "string") return;

      try {
        const command = JSON.parse(messageEvent.data);
        onMessage && onMessage(command);
      } catch (err) {
        console.warn(`Received invalid json message on ${name}:`, messageEvent.data);
      }
    };
  }

  connectWs(); // Initiate the first connection
}
