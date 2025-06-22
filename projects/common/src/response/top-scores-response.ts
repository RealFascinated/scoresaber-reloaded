import { ScoreSaberLeaderboard } from "../model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { PlayerScore } from "../score/player-score";
import { Timeframe } from "../timeframe";

export type TopScoresResponse = {
  /**
   * The top scores.
   */
  scores: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[];

  /**
   * The timeframe returned.
   */
  timeframe: Timeframe;

  /**
   * The amount of scores to fetch.
   */
  limit: number;
};
