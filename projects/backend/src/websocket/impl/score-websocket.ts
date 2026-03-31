import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { PlayerScore } from "@ssr/common/score/player-score";
import { Websocket } from "../websocket";

export class ScoreWebsocket extends Websocket<PlayerScore<ScoreSaberScore>> {
  constructor() {
    super("/ws/score");
  }
}
