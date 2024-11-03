import ScoreSaberMetadataToken from "./metadata";
import ScoreSaberScoreToken from "./score";

export default interface ScoreSaberLeaderboardScoresPageToken {
  /**
   * The scores on this page.
   */
  scores: ScoreSaberScoreToken[];

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadataToken;
}
