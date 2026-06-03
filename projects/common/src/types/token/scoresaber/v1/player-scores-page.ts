import ScoreSaberMetadataToken from "./metadata";
import ScoreSaberPlayerScoreToken from "./player-score";

export default interface ScoreSaberPlayerScoresPageToken {
  /**
   * The scores on this page.
   */
  playerScores: ScoreSaberPlayerScoreToken[];

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadataToken;
}
