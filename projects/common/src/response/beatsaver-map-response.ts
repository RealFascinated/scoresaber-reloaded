import { MapDifficulty } from "../score/map-difficulty";
import BeatSaverAccountToken from "../types/token/beatsaver/account";
import BeatSaverMapDifficultyToken from "../types/token/beatsaver/map-difficulty";
import BeatSaverMapMetadataToken from "../types/token/beatsaver/map-metadata";

export type BeatSaverMapResponse = {
  /**
   * The hash of the map.
   */
  hash: string;

  /**
   * The name of the map.
   */
  name: string;

  /**
   * The description of the map.
   */
  description: string;

  /**
   * The bsr code for the map.
   */
  bsr: string;

  /**
   * The URL to the song art.
   */
  songArt: string;

  /**
   * The author of the map.
   */
  author: BeatSaverAccountToken;

  /**
   * The versions of the map.
   */
  difficulty: BeatSaverMapDifficultyToken;

  /**
   * The difficulty labels of the map.
   */
  difficultyLabels: Record<MapDifficulty, string>;

  /**
   * The metadata of the map.
   */
  metadata: BeatSaverMapMetadataToken;
};
