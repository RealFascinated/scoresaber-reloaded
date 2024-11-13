import { MapDifficulty } from "../score/map-difficulty";
import { MapCharacteristic } from "../types/map-characteristic";

export type PlaylistSongDifficulty = {
  /**
   * The difficulty to highlight
   */
  difficulty: MapDifficulty;

  /**
   * The characteristic of the difficulty
   */
  characteristic: MapCharacteristic;
};
