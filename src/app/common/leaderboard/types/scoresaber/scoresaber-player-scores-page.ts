import ScoreSaberMetadata from "./scoresaber-metadata";
import ScoreSaberPlayerScore from "./scoresaber-player-score";

export default interface ScoreSaberPlayerScoresPage {
  /**
   * The scores on this page.
   */
  playerScores: ScoreSaberPlayerScore[];

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadata;
}
