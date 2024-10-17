import WebSocket from "ws";
import ScoreSaberPlayerScoreToken from "../types/token/scoresaber/score-saber-player-score-token";

type ScoresaberSocket = {
  /**
   * Invoked when a general message is received.
   *
   * @param message The received message.
   */
  onMessage?: (message: unknown) => void;

  /**
   * Invoked when a score message is received.
   *
   * @param score The received score data.
   */
  onScore?: (score: ScoreSaberPlayerScoreToken) => void;
};

/**
 * Connects to the ScoreSaber websocket and handles incoming messages.
 */
export function connectScoreSaberWebSocket({ onMessage, onScore }: ScoresaberSocket) {
  let websocket: WebSocket | null = null;

  function connectWs() {
    websocket = new WebSocket("wss://scoresaber.com/ws");

    websocket.onopen = () => {
      console.log("Connected to the ScoreSaber WebSocket!");
    };

    websocket.onerror = error => {
      console.error("WebSocket Error:", error);
      if (websocket) {
        websocket.close(); // Close the connection on error
      }
    };

    websocket.onclose = () => {
      console.log("Lost connection to the ScoreSaber WebSocket. Attempting to reconnect...");
      setTimeout(connectWs, 5000); // Reconnect after 5 seconds
    };

    websocket.onmessage = messageEvent => {
      if (typeof messageEvent.data !== "string") return;

      try {
        const command = JSON.parse(messageEvent.data);

        if (command.commandName === "score") {
          onScore && onScore(command.commandData as ScoreSaberPlayerScoreToken);
        } else {
          onMessage && onMessage(command);
        }
      } catch (err) {
        console.warn("Received invalid message:", messageEvent.data);
      }
    };
  }

  connectWs(); // Initiate the first connection
}
