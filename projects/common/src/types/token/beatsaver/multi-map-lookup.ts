import { BeatSaverMapToken } from "./map";

export type BeatSaverMultiMapLookup = {
  /**
   * The hash of the map and the map.
   */
  [key: string]: BeatSaverMapToken;
};
