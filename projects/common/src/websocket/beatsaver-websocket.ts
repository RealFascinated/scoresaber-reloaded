import { BeatSaverMapToken } from "../schemas/beatsaver/tokens/map";
import { BeatSaverWebsocketMessageToken } from "../schemas/beatsaver/tokens/websocket/websocket-message";
import { connectWebSocket, WebsocketCallbacks } from "./websocket";

type ScoresaberWebsocket = {
  onMapUpdate?: (map: BeatSaverMapToken) => void;
} & WebsocketCallbacks;

export function connectBeatSaverWebsocket({ onMessage, onDisconnect, onMapUpdate }: ScoresaberWebsocket) {
  return connectWebSocket({
    name: "BeatSaver",
    url: "wss://ws.beatsaver.com/maps",
    onMessage: (message: unknown) => {
      const command = message as BeatSaverWebsocketMessageToken;
      if (typeof command !== "object" || command === null) {
        return;
      }

      if (command.type === "MAP_UPDATE") {
        onMapUpdate && onMapUpdate(command.msg as BeatSaverMapToken);
      } else {
        onMessage && onMessage(command);
      }
    },
    onDisconnect,
  });
}
