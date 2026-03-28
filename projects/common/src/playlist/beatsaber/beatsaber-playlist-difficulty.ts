import { MapCharacteristic } from "../../schemas/map/map-characteristic";
import { MapDifficulty } from "../../schemas/map/map-difficulty";

export type BeatSaberPlaylistDifficulty = {
  characteristic: MapCharacteristic;
  name: MapDifficulty;
};
