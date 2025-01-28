import Dexie, { EntityTable } from "dexie";
import Settings from "./types/settings";
import { Friend } from "@/common/database/types/friends";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { setCookieValue } from "@ssr/common/utils/cookie-utils";
import { SSRCache } from "@ssr/common/cache";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/player";
import { ssrApi } from "@ssr/common/utils/ssr-api";

const SETTINGS_ID = "SSR"; // DO NOT CHANGE

const playerCache = new SSRCache({
  ttl: 60 * 30, // 30 minutes
});

export default class Database extends Dexie {
  /**
   * The settings for the website.
   */
  settings!: EntityTable<Settings, "id">;

  /**
   * The added friends
   */
  friends!: EntityTable<Friend, "id">;

  constructor() {
    super("ScoreSaberReloaded");

    // Stores
    this.version(1).stores({
      settings: "id",
      beatSaverMaps: "hash",
      friends: "id",
    });

    // Mapped tables
    this.settings.mapToClass(Settings);

    // Populate default settings if the table is empty
    this.on("populate", () => this.populateDefaults());

    this.on("ready", async () => {
      const settings = await this.getSettings();
      // If the settings are not found, return
      if (settings == undefined || settings.playerId == undefined) {
        return;
      }
      await setCookieValue("playerId", settings.playerId);
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
   * Gets the claimed player's scoresaber token
   */
  async getClaimedPlayer(): Promise<ScoreSaberPlayerToken | undefined> {
    const settings = await this.getSettings();
    if (settings == undefined || settings.playerId == undefined) {
      return;
    }
    if (playerCache.has(settings.playerId)) {
      return playerCache.get(settings.playerId);
    }
    const player = scoresaberService.lookupPlayer(settings.playerId);
    if (player == undefined) {
      return undefined;
    }
    playerCache.set(settings.playerId, player);
    return player;
  }

  /**
   * Adds a friend
   *
   * @param id the id of the friend
   */
  public async addFriend(id: string) {
    await this.friends.add({ id });
  }

  /**
   * Removes a friend
   *
   * @param id the id of the friend
   */
  public async removeFriend(id: string) {
    await this.friends.delete(id);
  }

  /**
   * Checks if this player is a friend
   *
   * @param id the id of the player
   */
  public async isFriend(id: string): Promise<boolean> {
    const friend = await this.friends.get(id);
    return friend != undefined;
  }

  /**
   * Gets all friends as {@link ScoreSaberPlayerToken}'s
   *
   * @returns the friends
   */
  public async getFriends(): Promise<ScoreSaberPlayerToken[]> {
    const friends = await this.friends.toArray();
    const players = await Promise.all(
      friends.map(async ({ id }) => {
        if (playerCache.has(id)) {
          return playerCache.get(id);
        }

        const token = await scoresaberService.lookupPlayer(id, "basic");
        if (token == undefined) {
          return undefined;
        }
        playerCache.set(id, token);
        await ssrApi.trackPlayer(id); // Track the player
        return token;
      })
    );
    return players.filter(player => player !== undefined) as ScoreSaberPlayerToken[];
  }

  /**
   * Gets all friend ids
   */
  public async getFriendIds(): Promise<string[]> {
    const friends = await this.friends.toArray();
    return friends.map(({ id }) => id);
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
