import BeatSaverAuthor from "../model/beatsaver/author";
import BeatSaverMapDifficulty from "../model/beatsaver/map-difficulty";
import BeatSaverMapMetadata from "../model/beatsaver/map-metadata";
import { MapDifficulty } from "../score/map-difficulty";

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
  author: BeatSaverAuthor;

  /**
   * The versions of the map.
   */
  difficulty: BeatSaverMapDifficulty;

  /**
   * The difficulty labels of the map.
   */
  difficultyLabels: Record<MapDifficulty, string>;

  /**
   * The metadata of the map.
   */
  metadata: BeatSaverMapMetadata;
};
