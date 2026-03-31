import { PlayerScore } from "../../../score/player-score";
import { Timeframe } from "../../../timeframe";
import { ScoreSaberScore } from "../../scoresaber/score/score";

export type TopScoresResponse = {
  /**
   * The top scores.
   */
  scores: PlayerScore<ScoreSaberScore>[];

  /**
   * The timeframe returned.
   */
  timeframe: Timeframe;

  /**
   * The amount of scores to fetch.
   */
  limit: number;
};
