import ScoreSaberMetadataToken from "./score-saber-metadata-token";
import ScoreSaberPlayerScoreToken from "./score-saber-player-score-token";

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
