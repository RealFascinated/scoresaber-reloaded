import { connectWebSocket, WebsocketCallbacks } from "./websocket";
import { BeatLeaderScoreToken } from "../types/token/beatleader/score/score";

type BeatLeaderWebsocket = {
  /**
   * Invoked when a score message is received.
   *
   * @param score the received score data.
   */
  onScore?: (score: BeatLeaderScoreToken) => void;
} & WebsocketCallbacks;

/**
 * Connects to the BeatLeader websocket and handles incoming messages.
 *
 * @param onMessage the onMessage callback
 * @param onScore the onScore callback
 * @param onDisconnect the onDisconnect callback
 */
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
