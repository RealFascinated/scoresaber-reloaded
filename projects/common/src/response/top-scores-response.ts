import { ScoreSaberLeaderboard } from "src/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "../model/score/impl/scoresaber-score";
import { PlayerScore } from "../score/player-score";

export type TopScoresResponse = {
  /**
   * The top scores.
   */
  scores: PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>[];
};
