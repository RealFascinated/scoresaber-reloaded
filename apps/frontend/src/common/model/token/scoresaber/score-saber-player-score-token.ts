import ScoreSaberLeaderboardToken from "./score-saber-leaderboard-token";
import ScoreSaberScoreToken from "./score-saber-score-token";

export default interface ScoreSaberPlayerScoreToken {
  /**
   * The score of the player score.
   */
  score: ScoreSaberScoreToken;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboardToken;
}
