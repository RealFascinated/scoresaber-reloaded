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

  /**
   * Invoked when a map create message is received.
   *
   * @param map the received map create data.
   */
  onMapCreate?: (map: BeatSaverMapToken) => void;

  /**
   * Invoked when a map change message is received.
   *
   * @param map the received map change data.
   */
  onMapChange?: (map: BeatSaverMapToken) => void;
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
  onMapCreate,
  onMapChange,
}: ScoresaberWebsocket) {
  return connectWebSocket({
    name: "BeatSaver",
    url: "wss://ws.beatsaver.com/maps",
    onMessage: (message: unknown) => {
      const command = message as BeatSaverWebsocketMessageToken;
      if (typeof command !== "object" || command === null) {
        return;
      }

      // Genric map changes: update, create
      if (command.type === "MAP_UPDATE" || command.type === "MAP_CREATE") {
        onMapChange && onMapChange(command.msg as BeatSaverMapToken);
      }

      // Handle map update messages
      if (command.type === "MAP_UPDATE") {
        onMapUpdate && onMapUpdate(command.msg as BeatSaverMapToken);
      } else if (command.type === "MAP_CREATE") {
        onMapCreate && onMapCreate(command.msg as BeatSaverMapToken);
      } else {
        onMessage && onMessage(command);
      }
    },
    onDisconnect,
  });
}
