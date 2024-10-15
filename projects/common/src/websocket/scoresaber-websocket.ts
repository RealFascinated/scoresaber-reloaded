import WebSocket from "ws";
import ScoreSaberPlayerScoreToken from "../types/token/scoresaber/score-saber-player-score-token";

type ScoresaberWebsocket = {
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
 * Connects to the ScoreSaber WebSocket and handles incoming messages.
 */
export function connectScoreSaberWebSocket({ onMessage, onScore }: ScoresaberWebsocket) {
  let websocket = connectWs();

  websocket.onopen = () => {
    console.log("Connected to the ScoreSaber WebSocket!");
  };

  websocket.onerror = error => {
    console.error("WebSocket Error:", error);
  };

  websocket.onclose = () => {
    console.log("Lost connection to the ScoreSaber WebSocket. Reconnecting in 5 seconds...");
    setTimeout(() => {
      websocket = connectWs();
    }, 5000);
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

/**
 * Initializes and returns a new WebSocket connection to ScoreSaber.
 */
function connectWs(): WebSocket {
  console.log("Connecting to the ScoreSaber WebSocket...");
  return new WebSocket("wss://scoresaber.com/ws");
}
