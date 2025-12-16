import ScoreSaberPlayerScoreToken from "../types/token/scoresaber/player-score";
import { ScoreSaberWebsocketMessageToken } from "../types/token/scoresaber/websocket/websocket-message";
import { connectWebSocket, WebsocketCallbacks } from "./websocket";

type ScoresaberWebsocket = {
  /**
   * Invoked when a score message is received.
   *
   * @param score the received score data.
   */
  onScore?: (score: ScoreSaberPlayerScoreToken) => void;
} & WebsocketCallbacks;

/**
 * Connects to the Scoresaber websocket and handles incoming messages.
 *
 * @param onMessage the onMessage callback
 * @param onScore the onScore callback
 * @param onDisconnect the onDisconnect callback
 */
export function connectScoresaberWebsocket({
  onMessage,
  onScore,
  onDisconnect,
}: ScoresaberWebsocket) {
  return connectWebSocket({
    name: "Scoresaber",
    url: "wss://scoresaber.com/ws",
    onMessage: (message: unknown) => {
      const command = message as ScoreSaberWebsocketMessageToken;
      if (typeof command !== "object" || command === null) {
        return;
      }
      if (command.commandName === "score") {
        onScore && onScore(command.commandData as ScoreSaberPlayerScoreToken);
      } else {
        onMessage && onMessage(command);
      }
    },
    onDisconnect,
  });
}
