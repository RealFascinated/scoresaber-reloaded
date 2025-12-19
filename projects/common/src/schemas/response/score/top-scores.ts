import { PlayerScore } from "../../../score/player-score";
import { Timeframe } from "../../../timeframe";

export type TopScoresResponse = {
  /**
   * The top scores.
   */
  scores: PlayerScore[];

  /**
   * The timeframe returned.
   */
  timeframe: Timeframe;

  /**
   * The amount of scores to fetch.
   */
  limit: number;
};
