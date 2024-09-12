import ScoreSaberMetadata from "./scoresaber-metadata";
import ScoreSaberScore from "./scoresaber-score";

export default interface ScoreSaberLeaderboardScoresPage {
  /**
   * The scores on this page.
   */
  scores: ScoreSaberScore[];

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadata;
}
