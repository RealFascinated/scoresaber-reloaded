import BeatSaverMapToken from "../types/token/beatsaver/map";
import { BeatSaverWebsocketMessageToken } from "../types/token/beatsaver/websocket/websocket-message";
import { connectWebSocket, WebsocketCallbacks } from "./websocket";

type ScoresaberWebsocket = {
  /**
   * Invoked when a map update message is received.
   *
   * @param map the received map update data.
   */
  onMapUpdate?: (map: BeatSaverMapToken) => void;
} & WebsocketCallbacks;

/**
 * Connects to the Scoresaber websocket and handles incoming messages.
 *
 * @param onMessage the onMessage callback
 * @param onScore the onScore callback
 * @param onDisconnect the onDisconnect callback
 */
export function connectBeatSaverWebsocket({
  onMessage,
  onDisconnect,
  onMapUpdate,
}: ScoresaberWebsocket) {
  return connectWebSocket({
    name: "BeatSaver",
    url: "wss://ws.beatsaver.com/maps",
    onMessage: (message: unknown) => {
      const command = message as BeatSaverWebsocketMessageToken;
      if (typeof command !== "object" || command === null) {
        return;
      }

      // Handle map update messages
      if (command.type === "MAP_UPDATE") {
        onMapUpdate && onMapUpdate(command.msg as BeatSaverMapToken);
      } else {
        onMessage && onMessage(command);
      }
    },
    onDisconnect,
  });
}
