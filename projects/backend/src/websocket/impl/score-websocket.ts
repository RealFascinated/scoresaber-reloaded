import { PlayerScore } from "@ssr/common/score/player-score";
import { Websocket } from "../websocket";

export type ScoreWebsocketEvent = PlayerScore;

export class ScoreWebsocket extends Websocket<ScoreWebsocketEvent> {
  constructor() {
    super("/ws/score");
  }
}
