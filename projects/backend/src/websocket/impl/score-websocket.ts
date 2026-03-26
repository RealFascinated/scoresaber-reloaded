import { PlayerScore } from "@ssr/common/score/player-score";
import { Websocket } from "../websocket";

export class ScoreWebsocket extends Websocket<PlayerScore> {
  constructor() {
    super("/ws/score");
  }
}
