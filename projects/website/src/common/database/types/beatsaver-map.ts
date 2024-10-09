import { Entity } from "dexie";
import Database from "../database";
import { BeatSaverMapToken } from "@ssr/common/types/token/beatsaver/beat-saver-map-token";

/**
 * A beat saver map.
 */
export default class BeatSaverMap extends Entity<Database> {
  /**
   * The hash of the map.
   */
  hash!: string;

  /**
   * The bsr code for the map.
   */
  bsr!: string;

  /**
   * The full data for the map.
   */
  fullData!: BeatSaverMapToken;
}
