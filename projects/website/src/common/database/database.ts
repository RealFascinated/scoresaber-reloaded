import Dexie, { EntityTable } from "dexie";
import { setPlayerIdCookie } from "../website-utils";
import BeatSaverMap from "./types/beatsaver-map";
import Settings from "./types/settings";

const SETTINGS_ID = "SSR"; // DO NOT CHANGE

export default class Database extends Dexie {
  /**
   * The settings for the website.
   */
  settings!: EntityTable<Settings, "id">;

  /**
   * Cached BeatSaver maps
   */
  beatSaverMaps!: EntityTable<BeatSaverMap, "hash">;

  constructor() {
    super("ScoreSaberReloaded");

    // Stores
    this.version(1).stores({
      settings: "id",
      beatSaverMaps: "hash",
    });

    // Mapped tables
    this.settings.mapToClass(Settings);
    this.beatSaverMaps.mapToClass(BeatSaverMap);

    // Populate default settings if the table is empty
    this.on("populate", () => this.populateDefaults());

    this.on("ready", async () => {
      const settings = await this.getSettings();
      // If the settings are not found, return
      if (settings == undefined || settings.playerId == undefined) {
        return;
      }
      setPlayerIdCookie(settings.playerId);
    });
  }

  /**
   * Populates the default settings
   */
  async populateDefaults() {
    await this.resetSettings();
  }

  /**
   * Gets the settings from the database
   *
   * @returns the settings
   */
  async getSettings(): Promise<Settings | undefined> {
    return this.settings.get(SETTINGS_ID);
  }

  /**
   * Sets the settings in the database
   *
   * @param settings the settings to set
   * @returns the settings
   */
  async setSettings(settings: Settings) {
    return this.settings.update(SETTINGS_ID, settings);
  }

  /**
   * Resets the settings in the database
   */
  async resetSettings() {
    this.settings.delete(SETTINGS_ID);
    this.settings.add({
      id: SETTINGS_ID, // Fixed ID for the single settings object
      backgroundCover: "/assets/background.jpg",
    });

    return this.getSettings();
  }
}

export const db = new Database();
