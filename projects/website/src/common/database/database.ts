import Settings from "@/common/database/impl/settings";
import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import Dexie, { EntityTable } from "dexie";
import { setCookieValue } from "../cookie.util";

type CacheItem = {
  id: string;
  lastUpdated: number;
  item: unknown;
};

type Friend = {
  id: string;
};

const SETTINGS_ID = "SSR";

export default class Database extends Dexie {
  settings!: EntityTable<Settings, "id">;
  friends!: EntityTable<Friend, "id">;
  cache!: EntityTable<CacheItem, "id">;

  constructor() {
    super("ScoreSaberReloaded");

    this.version(32).stores({
      settings: "id",
      beatSaverMaps: "hash",
      friends: "id",
      cache: "id",
    });

    this.version(32).upgrade(async transaction => {
      await transaction.table("cache").clear();
    });

    this.settings.mapToClass(Settings);

    this.on("populate", () => this.resetSettings());
    this.on("ready", async () => {
      await this.getFriends(); // Pre-fetch friends
      await this.initializeCookie();
    });
  }

  /**
   * Initializes the cookie
   * @private
   */
  private async initializeCookie() {
    try {
      const settings = await this.getSettings();
      if (settings?.playerId) {
        await setCookieValue("playerId", settings.playerId);
      }
    } catch (error) {
      console.error("Failed to initialize cookie:", error);
    }
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
   * Gets the claimed player's account.
   *
   * @returns the claimed player's account
   */
  async getClaimedPlayer(): Promise<ScoreSaberPlayer | undefined> {
    const settings = await this.getSettings();
    if (!settings?.playerId) {
      return undefined;
    }

    return this.getPlayer(settings.playerId);
  }

  /**
   * Adds a friend
   *
   * @param id the id of the friend
   */
  async addFriend(id: string) {
    await this.friends.add({ id });
  }

  /**
   * Removes a friend
   *
   * @param id the id of the friend
   */
  async removeFriend(id: string) {
    await this.friends.delete(id);
  }

  /**
   * Checks if a player is a friend
   *
   * @param id the id of the player
   * @returns whether the player is a friend
   */
  async isFriend(id: string): Promise<boolean> {
    const friend = await this.friends.get(id);
    return friend != undefined;
  }

  /**
   * Gets the accounts of all friends
   *
   * @returns the accounts
   */
  async getFriends(includeSelf?: boolean): Promise<ScoreSaberPlayer[]> {
    const friends = await this.friends.toArray();
    if (includeSelf) {
      const claimedPlayer = await this.getClaimedPlayer();
      if (claimedPlayer) {
        friends.push({ id: claimedPlayer.id });
      }
    }

    const players = await Promise.all(
      friends.map(async ({ id }) => {
        return this.getPlayer(id);
      })
    );

    return players
      .filter((player): player is ScoreSaberPlayer => player !== undefined)
      .sort((a, b) => a.rank - b.rank);
  }

  /**
   * Gets the ids of all friends
   *
   * @returns the ids of all friends
   */
  async getFriendIds(): Promise<string[]> {
    const friends = await this.friends.toArray();
    return friends.map(({ id }) => id);
  }

  /**
   * Fetches an item from the cache or
   * inserts it if it doesn't exist.
   *
   * @param key the key of the item
   * @param ttl the time to live in seconds
   * @param insertCallback the callback to insert the item if it doesn't exist
   * @returns the item
   * @private
   */
  private async getCache<T>(
    key: string,
    ttl: number = 60 * 60,
    insertCallback?: () => Promise<T | undefined>
  ): Promise<T | undefined> {
    const item = await this.cache.get(key);
    const ttlMs = ttl * 1000;

    // Return cached item if valid
    if (item && item.lastUpdated + ttlMs >= Date.now()) {
      return item.item as T;
    }

    // Return undefined if no insert callback
    if (!insertCallback) {
      return undefined;
    }

    // Try to fetch and cache new item
    try {
      const newItem = await insertCallback();
      if (!newItem) {
        return undefined;
      }

      const cacheItem: CacheItem = {
        id: key,
        lastUpdated: Date.now(),
        item: newItem,
      };

      await this.cache.put(cacheItem);
      return newItem;
    } catch (error) {
      Logger.error(`Cache error details:`, error);
      return undefined;
    }
  }

  /**
   * Fetches a player from the cache (cached for 6 hours) or
   * lookups it if it doesn't exist. j
   *
   * @param id the player's id
   * @returns the player
   */
  public async getPlayer(id: string): Promise<ScoreSaberPlayer | undefined> {
    return this.getCache<ScoreSaberPlayer>(`player:${id}`, 60 * 60 * 6, async () => {
      try {
        return await ssrApi.getScoreSaberPlayer(id, {
          type: DetailType.FULL,
        });
      } catch (error) {
        Logger.error(`Failed to fetch player ${id}:`, error);
        return undefined;
      }
    });
  }

  /**
   * Resets the database to default values
   */
  async resetSettings() {
    await this.settings.delete(SETTINGS_ID);
    await this.settings.add({
      id: SETTINGS_ID,
      backgroundCover: "/assets/background.jpg",
    });
    await this.cache.clear();

    return this.getSettings();
  }
}

export const db = new Database();
