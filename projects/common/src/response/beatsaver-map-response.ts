import BeatSaverAuthor from "../model/beatsaver/author";
import BeatSaverMapDifficulty from "../model/beatsaver/map-difficulty";
import BeatSaverMapMetadata from "../model/beatsaver/map-metadata";

export type BeatSaverMapResponse = {
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
   * The author of the map.
   */
  author: BeatSaverAuthor;

  /**
   * The versions of the map.
   */
  difficulty: BeatSaverMapDifficulty;

  /**
   * The metadata of the map.
   */
  metadata: BeatSaverMapMetadata;
};
