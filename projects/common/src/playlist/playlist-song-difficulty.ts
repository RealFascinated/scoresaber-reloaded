import { MapCharacteristic } from "../schemas/map/map-characteristic";
import { MapDifficulty } from "../schemas/map/map-difficulty";

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
