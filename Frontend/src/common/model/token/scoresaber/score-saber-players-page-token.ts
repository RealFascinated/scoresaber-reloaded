import ScoreSaberMetadataToken from "./score-saber-metadata-token";
import ScoreSaberPlayerToken from "./score-saber-player-token";

export interface ScoreSaberPlayersPageToken {
  /**
   * The players that were found
   */
  players: ScoreSaberPlayerToken[];

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadataToken;
}
