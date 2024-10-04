import ScoreSaberMetadataToken from "./score-saber-metadata-token";
import ScoreSaberScoreToken from "./score-saber-score-token";

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
