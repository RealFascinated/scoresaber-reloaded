import ScoreSaberLeaderboardToken from "./leaderboard";
import ScoreSaberScoreToken from "./score";

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
