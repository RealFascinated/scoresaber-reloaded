import { BeatLeaderScoreToken } from "../schemas/beatleader/tokens/score/score";
import { connectWebSocket, WebsocketCallbacks } from "./websocket";

type BeatLeaderWebsocket = {
  onScore?: (score: BeatLeaderScoreToken) => void;
} & WebsocketCallbacks;

export function connectBeatLeaderWebsocket({ onMessage, onScore, onDisconnect }: BeatLeaderWebsocket) {
  return connectWebSocket({
    name: "BeatLeader",
    url: "wss://sockets.api.beatleader.xyz/scores",
    onMessage: (message: unknown) => {
      onScore && onScore(message as BeatLeaderScoreToken);
      onMessage && onMessage(message);
    },
    onDisconnect,
  });
}
