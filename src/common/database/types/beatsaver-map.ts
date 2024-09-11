import { Entity } from "dexie";
import Database from "../database";

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
}
