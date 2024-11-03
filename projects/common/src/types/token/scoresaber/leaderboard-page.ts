import ScoreSaberMetadataToken from "./metadata";
import ScoreSaberLeaderboardToken from "./leaderboard";

export default interface ScoreSaberLeaderboardPageToken {
  /**
   * The leaderboards on this page.
   */
  leaderboards: ScoreSaberLeaderboardToken[];

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadataToken;
}
