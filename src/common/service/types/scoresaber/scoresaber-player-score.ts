import ScoreSaberLeaderboard from "./scoresaber-leaderboard";
import ScoreSaberScore from "./scoresaber-score";

export default interface ScoreSaberPlayerScore {
  /**
   * The score of the player score.
   */
  score: ScoreSaberScore;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
}
