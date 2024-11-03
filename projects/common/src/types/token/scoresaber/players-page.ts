import ScoreSaberMetadataToken from "./metadata";
import ScoreSaberPlayerToken from "./player";

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
