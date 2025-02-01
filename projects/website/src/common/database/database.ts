import Dexie, { EntityTable } from "dexie";
import Settings from "@/common/database/impl/settings";
import { Friend } from "@/common/database/impl/friends";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/player";
import { setCookieValue } from "@ssr/common/utils/cookie-utils";
import Logger from "@ssr/common/logger";
import { scoresaberService } from "@ssr/common/service/impl/scoresaber";
import { formatDuration } from "@ssr/common/utils/time-utils";

const SETTINGS_ID = "SSR";

type CacheItem = {
  id: string;
  lastUpdated: number;
  item: unknown;
};

export default class Database extends Dexie {
  settings!: EntityTable<Settings, "id">;
  friends!: EntityTable<Friend, "id">;
  cache!: EntityTable<CacheItem, "id">;

  constructor() {
    super("ScoreSaberReloaded");

    this.version(2).stores({
      settings: "id",
      beatSaverMaps: "hash",
      friends: "id",
      cache: "id",
    });

    this.settings.mapToClass(Settings);

    this.on("populate", () => this.resetSettings());
    this.on("ready", async () => {
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
  async getClaimedPlayer(): Promise<ScoreSaberPlayerToken | undefined> {
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
  async getFriends(): Promise<ScoreSaberPlayerToken[]> {
    const friends = await this.friends.toArray();
    const players = await Promise.all(
      friends.map(async ({ id }) => {
        return this.getPlayer(id);
      })
    );

    return players.filter((player): player is ScoreSaberPlayerToken => player !== undefined);
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
    const startTime = Date.now();
    Logger.info(`Getting ${key} from cache...`);

    const logFinish = (message: string) => {
      const timeTaken = Date.now() - startTime;
      Logger.info(`${message} (${formatDuration(timeTaken)})`);
    };

    const item = await this.cache.get(key);
    const ttlMs = ttl * 1000;

    // Return cached item if valid
    if (item && item.lastUpdated + ttlMs >= Date.now()) {
      logFinish(`Retrieved ${key} from cache`);
      return item.item as T;
    }

    // Return undefined if no insert callback
    if (!insertCallback) {
      logFinish(`Cache miss for ${key}, no callback provided`);
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
      logFinish(`Fetched and cached ${key}`);
      return newItem;
    } catch (error) {
      logFinish(`Failed to fetch/cache item for ${key}`);
      Logger.error(`Cache error details:`, error);
      return undefined;
    }
  }

  /**
   * Fetches a player from the cache or
   * lookups it if it doesn't exist.
   *
   * @param id the player's id
   * @returns the player
   */
  public async getPlayer(id: string): Promise<ScoreSaberPlayerToken | undefined> {
    return this.getCache<ScoreSaberPlayerToken>(`player:${id}`, 60 * 60, async () => {
      try {
        return await scoresaberService.lookupPlayer(id);
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
