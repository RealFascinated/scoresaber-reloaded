import { DetailType } from "@ssr/common/detail-type";
import Logger from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import Dexie, { EntityTable } from "dexie";
import { deleteCookieValue, setCookieValue } from "../cookie.util";
import { defaultOverlaySettings, OverlaySettings } from "../overlay/overlay-settings";
import { ReplayViewer, ReplayViewers } from "../replay-viewer";

type CacheItem = {
  /**
   * The id of the cache item
   */
  id: string;

  /**
   * The last updated time of the cache item
   */
  lastUpdated: number;

  /**
   * The item of the cache
   */
  item: unknown;
};

type Setting = {
  /**
   * The id of the setting
   */
  id: string;

  /**
   * The value of the setting
   */
  value: unknown;
};

export enum SettingIds {
  MainPlayer = "mainPlayer",
  BackgroundCover = "backgroundCover",
  ShowKitty = "showKitty",
  SnowParticles = "snowParticles",
  WhatIfRange = "whatIfRange",
  ChartLegends = "chartLegends",
  OverlaySettings = "overlaySettings",
  ReplayViewer = "replayViewer",
  Friends = "friends",
}

export default class Database extends Dexie {
  settings!: EntityTable<Setting, "id">;
  cache!: EntityTable<CacheItem, "id">;

  chartLegendsCache!: Record<string, Record<string, boolean>>;

  constructor(before: number) {
    super("ssr");

    this.version(1).stores({
      settings: "id",
      cache: "id",
    });

    this.on("ready", async () => {
      Logger.info(`Database ready in ${(performance.now() - before).toFixed(0)}ms`);

      this.initializeCookie(); // Initialize cookie
      this.getFriends(true); // Pre-fetch friends
    });
  }

  /**
   * Gets the main player from the database
   *
   * @returns the main player
   */
  async getMainPlayerId(): Promise<string | undefined> {
    return this.getSetting<string>(SettingIds.MainPlayer);
  }

  /**
   * Gets the main player from the database
   *
   * @returns the main player
   */
  async getMainPlayer(): Promise<ScoreSaberPlayer | undefined> {
    const id = await this.getMainPlayerId();
    if (!id) {
      return undefined;
    }
    return this.getPlayer(id);
  }

  /**
   * Sets the main player id in the database
   *
   * @param id the id of the main player
   */
  async setMainPlayerId(id: string) {
    await this.setSetting(SettingIds.MainPlayer, id);
  }

  /**
   * Adds a friend
   *
   * @param id the id of the friend
   */
  async addFriend(id: string) {
    const friends = await this.getFriendIds();
    if (!friends.includes(id)) {
      friends.push(id);
      await this.setSetting(SettingIds.Friends, friends);
    }
  }

  /**
   * Removes a friend
   *
   * @param id the id of the friend
   */
  async removeFriend(id: string) {
    const friends = await this.getFriendIds();
    const index = friends.indexOf(id);
    if (index > -1) {
      friends.splice(index, 1);
      await this.setSetting(SettingIds.Friends, friends);
    }
  }

  /**
   * Initializes the cookie
   * @private
   */
  private async initializeCookie() {
    const mainPlayerId = await this.getMainPlayerId();
    if (mainPlayerId) {
      await setCookieValue("playerId", mainPlayerId);
    } else {
      await deleteCookieValue("playerId");
    }
  }

  /**
   * Checks if a player is a friend
   *
   * @param id the id of the player
   * @returns whether the player is a friend
   */
  async isFriend(id: string): Promise<boolean> {
    return (await this.getFriendIds()).includes(id);
  }

  /**
   * Gets the accounts of all friends
   *
   * @returns the accounts
   */
  async getFriends(includeSelf?: boolean): Promise<ScoreSaberPlayer[]> {
    const friends = await this.getFriendIds(includeSelf);
    if (friends.length === 0) {
      return [];
    }

    const players = await Promise.all(
      friends.map(async id => {
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
  async getFriendIds(includeSelf?: boolean): Promise<string[]> {
    const friends = (await this.getSetting<string[]>(SettingIds.Friends, [])) ?? [];
    if (includeSelf) {
      const mainPlayerId = await this.getMainPlayerId();
      if (mainPlayerId) {
        friends.push(mainPlayerId);
      }
    }
    return friends;
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
   * Initializes the chart legends cache
   */
  async initializeChartLegends() {
    this.chartLegendsCache =
      (await this.getSetting<Record<string, Record<string, boolean>>>(SettingIds.ChartLegends)) ||
      {};
  }

  /**
   * Gets the chart legend for a given id and title
   *
   * @param id the id of the chart
   * @param title the title of the chart
   * @param defaultState the default state of the chart
   * @returns the chart legend
   */
  getChartLegend(id: string, title: string, defaultState?: boolean): boolean {
    return this.chartLegendsCache[id]?.[title] ?? defaultState ?? false;
  }

  /**
   * Sets the chart legend for a given id and title
   *
   * @param id the id of the chart
   * @param title the title of the chart
   * @param state the state of the chart
   */
  async setChartLegend(id: string, title: string, state: boolean) {
    const setting = await this.getSetting<Record<string, Record<string, boolean>>>(
      SettingIds.ChartLegends,
      {}
    );

    if (!setting) {
      return;
    }

    setting[id] = setting[id] ?? {};
    setting[id][title] = state;

    this.chartLegendsCache[id] = this.chartLegendsCache[id] ?? {};
    this.chartLegendsCache[id][title] = state;

    await this.setSetting(SettingIds.ChartLegends, setting);
  }

  /**
   * Gets the background cover from the database
   *
   * @returns the background cover
   */
  async getBackgroundCover(): Promise<string> {
    return (await this.getSetting<string>(SettingIds.BackgroundCover, "/assets/background.jpg"))!;
  }

  /**
   * Sets the background cover in the database
   *
   * @param cover the background cover
   */
  async setBackgroundCover(cover: string) {
    await this.setSetting(SettingIds.BackgroundCover, cover);
  }

  /**
   * Gets the show kitty setting from the database
   *
   * @returns the show kitty setting
   */
  async getShowKitty(): Promise<boolean> {
    return (await this.getSetting<boolean>(SettingIds.ShowKitty, false))!;
  }

  /**
   * Sets the show kitty setting in the database
   *
   * @param showKitty the show kitty setting
   */
  async setShowKitty(showKitty: boolean) {
    await this.setSetting(SettingIds.ShowKitty, showKitty);
  }

  /**
   * Gets the snow particles setting from the database
   *
   * @returns the snow particles setting
   */
  async getSnowParticles(): Promise<boolean> {
    return (await this.getSetting<boolean>(SettingIds.SnowParticles, false))!;
  }

  /**
   * Sets the snow particles setting in the database
   *
   * @param snowParticles the snow particles setting
   */
  async setSnowParticles(snowParticles: boolean) {
    await this.setSetting(SettingIds.SnowParticles, snowParticles);
  }

  /**
   * Gets the what if range setting from the database
   *
   * @returns the what if range setting
   */
  async getWhatIfRange(): Promise<[number, number]> {
    return (await this.getSetting<[number, number]>(SettingIds.WhatIfRange, [5, 100]))!;
  }

  /**
   * Sets the what if range setting in the database
   *
   * @param whatIfRange the what if range setting
   */
  async setWhatIfRange(whatIfRange: [number, number]) {
    await this.setSetting(SettingIds.WhatIfRange, whatIfRange);
  }

  /**
   * Gets the overlay settings from the database
   *
   * @returns the overlay settings
   */
  async getOverlaySettings(): Promise<OverlaySettings> {
    return (await this.getSetting<OverlaySettings>(SettingIds.OverlaySettings, {
      ...defaultOverlaySettings,
      playerId: (await this.getMainPlayerId()) ?? "",
    } as OverlaySettings))!;
  }

  /**
   * Gets the replay viewer from the database
   *
   * @returns the replay viewer
   */
  async getReplayViewer(): Promise<ReplayViewer> {
    return ReplayViewers[(await this.getSetting<string>(SettingIds.ReplayViewer, "beatleader"))!];
  }

  /**
   * Sets the replay viewer in the database
   *
   * @param viewer the replay viewer
   */
  async setReplayViewer(viewer: string) {
    await this.setSetting(SettingIds.ReplayViewer, viewer);
  }

  /**
   * Sets the overlay settings in the database
   *
   * @param overlaySettings the overlay settings
   */
  async setOverlaySettings(overlaySettings: OverlaySettings) {
    await this.setSetting(SettingIds.OverlaySettings, overlaySettings);
  }

  /**
   * Gets a setting from the database
   *
   * @param id the id of the setting
   * @returns the setting
   */
  async getSetting<T>(id: string, defaultValue?: T): Promise<T | undefined> {
    const setting = await this.settings.get(id);
    return (setting?.value as T | undefined) ?? defaultValue;
  }

  /**
   * Sets a setting in the database
   *
   * @param id the id of the setting
   * @param value the value of the setting
   */
  async setSetting<T>(id: string, value: T) {
    await this.settings.put({ id, value });
  }

  /**
   * Resets the database to default values
   */
  async reset() {
    await this.settings.clear();
    await this.cache.clear();
  }
}

/**
 * Gets the database
 *
 * @returns the database
 */
export function getDatabase(): Database {
  const before = performance.now();
  return new Database(before);
}
