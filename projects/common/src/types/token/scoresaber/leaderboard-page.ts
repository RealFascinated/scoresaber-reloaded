import ScoreSaberLeaderboardToken from "./leaderboard";
import ScoreSaberMetadataToken from "./metadata";

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
