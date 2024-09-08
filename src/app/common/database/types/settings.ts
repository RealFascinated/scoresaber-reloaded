import { Entity } from "dexie";
import Database from "../database";

/**
 * The website settings.
 */
export default class Settings extends Entity<Database> {
  /**
   * This is just so we can fetch the settings
   */
  id!: string;

  /**
   * The ID of the tracked player
   */
  playerId?: string;

  /**
   * The background image to use
   */
  backgroundImage?: string;

  /**
   * Sets the players id
   *
   * @param id the new player id
   */
  public setPlayerId(id: string) {
    this.playerId = id;
    this.db.setSettings(this);
  }

  /**
   * Sets the background image
   *
   * @param image the new background image
   */
  public setBackgroundImage(image: string) {
    this.backgroundImage = image;
    this.db.setSettings(this);
  }
}
