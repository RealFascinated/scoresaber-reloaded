import Dexie, { EntityTable } from "dexie";
import Settings from "./types/settings";

const SETTINGS_ID = "SSR"; // DO NOT CHANGE

export default class Database extends Dexie {
  settings!: EntityTable<Settings, "id">;

  constructor() {
    super("ScoreSaberReloaded");

    // Stores
    this.version(1).stores({
      settings: "id",
    });

    // Mapped tables
    this.settings.mapToClass(Settings);

    // Populate default settings if the table is empty
    this.on("populate", () => this.populateDefaults());
  }

  async populateDefaults() {
    await this.settings.add({
      id: SETTINGS_ID, // Fixed ID for the single settings object
      backgroundImage: "/assets/background.jpg",
    });
  }

  /**
   * Gets the settings from the database
   *
   * @returns the settings
   */
  async getSettings(): Promise<Settings | undefined> {
    return await this.settings.get(SETTINGS_ID);
  }

  /**
   * Sets the settings in the database
   *
   * @param settings the settings to set
   * @returns the settings
   */
  async setSettings(settings: Settings) {
    return await this.settings.update(SETTINGS_ID, settings);
  }
}

export const db = new Database();
