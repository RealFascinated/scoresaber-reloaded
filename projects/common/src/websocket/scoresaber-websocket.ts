import { ScoreSaberPlayerScoreToken } from "../schemas/scoresaber/tokens/v1/player-score";
import { ScoreSaberWebsocketMessageToken } from "../schemas/scoresaber/tokens/websocket/websocket-message";
import { connectWebSocket, WebsocketCallbacks } from "./websocket";

type ScoresaberWebsocket = {
  onScore?: (score: ScoreSaberPlayerScoreToken) => void;
} & WebsocketCallbacks;

export function connectScoresaberWebsocket({ onMessage, onScore, onDisconnect }: ScoresaberWebsocket) {
  return connectWebSocket({
    name: "Scoresaber",
    url: "wss://scoresaber.com/ws",
    onMessage: (message: unknown) => {
      // ScoreSaber sends a plain text welcome message on connect, ignore it
      if (typeof message === "string" && message.includes("Connected to the ScoreSaber")) {
        return;
      }

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
