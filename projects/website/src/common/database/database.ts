import { BACKGROUND_COVERS } from "@/components/background-cover";
import Logger from "@ssr/common/logger";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ReplayViewer, ReplayViewers } from "@ssr/common/replay-viewer";
import { ssrApi } from "@ssr/common/utils/ssr-api";
import Dexie, { EntityTable } from "dexie";
import { deleteCookieValue, setCookieValue } from "../cookie.util";
import { defaultOverlaySettings, OverlaySettings } from "../overlay/overlay-settings";
import { HistoryMode } from "../player/history-mode";

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
  BackgroundCoverBrightness = "backgroundCoverBrightness",
  BackgroundCoverBlur = "backgroundCoverBlur",
  CustomBackgroundUrl = "customBackgroundCover",
  ShowKitty = "showKitty",
  SnowParticles = "snowParticles",
  WhatIfRange = "whatIfRange",
  ChartLegends = "chartLegends",
  OverlaySettings = "overlaySettings",
  ReplayViewer = "replayViewer",
  Friends = "friends",
  ShowScoreComparison = "showScoreComparison",
  DefaultLeaderboardCountry = "defaultLeaderboardCountry",
  WebsiteLanding = "websiteLanding",
  PlusPpDefaultAccuracy = "plusPpDefaultAccuracy",
  HistoryMode = "historyMode",
}

export const DEFAULT_WHAT_IF_RANGE: [number, number] = [70, 98.5];

export enum WebsiteLanding {
  PLAYER_HOME = "playerHome",
  LANDING = "landing",
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
   * Checks if the database has a main player
   *
   * @returns whether the database has a main player
   */
  async hasMainPlayer(): Promise<boolean> {
    const id = await this.getMainPlayerId();
    return id !== undefined && id !== "";
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
  async setMainPlayerId(id: string | undefined) {
    await this.setSetting(SettingIds.MainPlayer, id);
    deleteCookieValue("playerId");
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
      setCookieValue("playerId", mainPlayerId);
    } else {
      deleteCookieValue("playerId");
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

    return players.filter((player): player is ScoreSaberPlayer => player !== undefined).sort((a, b) => a.rank - b.rank);
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
        return await ssrApi.getScoreSaberPlayer(id, "basic");
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
    // Only initialize if not already done
    if (this.chartLegendsCache === undefined) {
      this.chartLegendsCache =
        (await this.getSetting<Record<string, Record<string, boolean>>>(SettingIds.ChartLegends)) || {};
    }
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
    const setting = await this.getSetting<Record<string, Record<string, boolean>>>(SettingIds.ChartLegends, {});

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
    const cover = await this.getSetting<string>(SettingIds.BackgroundCover, BACKGROUND_COVERS[0].id);
    // Default to the first cover if no cover is set
    return cover ?? BACKGROUND_COVERS[0].id;
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
   * Gets the custom background url from the database
   *
   * @returns the custom background url
   */
  async getCustomBackgroundUrl(): Promise<string> {
    return (await this.getSetting<string>(SettingIds.CustomBackgroundUrl, BACKGROUND_COVERS[0].value))!;
  }

  /**
   * Sets the custom background url in the database
   *
   * @param url the custom background url
   */
  async setCustomBackgroundUrl(url: string) {
    await this.setSetting(SettingIds.CustomBackgroundUrl, url);
  }
  /**
   * Gets the background cover brightness from the database
   *
   * @returns the background cover brightness
   */
  async getBackgroundCoverBrightness(): Promise<number> {
    return (await this.getSetting<number>(SettingIds.BackgroundCoverBrightness, 50))!;
  }

  /**
   * Sets the background cover brightness in the database
   *
   * @param brightness the background cover brightness
   */
  async setBackgroundCoverBrightness(brightness: number) {
    await this.setSetting(SettingIds.BackgroundCoverBrightness, brightness);
  }

  /**
   * Gets the background cover blur from the database
   *
   * @returns the background cover blur
   */
  async getBackgroundCoverBlur(): Promise<number> {
    return (await this.getSetting<number>(SettingIds.BackgroundCoverBlur, 6))!;
  }

  /**
   * Sets the background cover blur in the database
   *
   * @param blur the background cover blur
   */
  async setBackgroundCoverBlur(blur: number) {
    await this.setSetting(SettingIds.BackgroundCoverBlur, blur);
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
    return (await this.getSetting<[number, number]>(SettingIds.WhatIfRange, DEFAULT_WHAT_IF_RANGE))!;
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
   * Gets the show score comparison setting from the database
   *
   * @returns the show score comparison setting
   */
  async getShowScoreComparison(): Promise<boolean> {
    return (await this.getSetting<boolean>(SettingIds.ShowScoreComparison, true))!;
  }

  /**
   * Sets the show score comparison setting in the database
   *
   * @param showScoreComparison the show score comparison setting
   */
  async setShowScoreComparison(showScoreComparison: boolean) {
    await this.setSetting(SettingIds.ShowScoreComparison, showScoreComparison);
  }

  /**
   * Gets the website landing setting from the database
   *
   * @returns the website landing setting
   */
  async getWebsiteLanding(): Promise<WebsiteLanding> {
    return (await this.getSetting<WebsiteLanding>(SettingIds.WebsiteLanding, WebsiteLanding.PLAYER_HOME))!;
  }

  /**
   * Sets the website landing setting in the database
   *
   * @param websiteLanding the website landing setting
   */
  async setWebsiteLanding(websiteLanding: WebsiteLanding) {
    setCookieValue("websiteLanding", websiteLanding);
    await this.setSetting(SettingIds.WebsiteLanding, websiteLanding);
  }

  /**
   * Gets the plus pp default accuracy setting from the database
   *
   * @returns the plus pp default accuracy setting
   */
  async getPlusPpDefaultAccuracy(): Promise<number> {
    return (await this.getSetting<number>(SettingIds.PlusPpDefaultAccuracy, 95))!;
  }

  /**
   * Sets the plus pp default accuracy setting in the database
   *
   * @param plusPpDefaultAccuracy the plus pp default accuracy setting
   */
  async setPlusPpDefaultAccuracy(plusPpDefaultAccuracy: number) {
    await this.setSetting(SettingIds.PlusPpDefaultAccuracy, plusPpDefaultAccuracy);
  }

  /**
   * Gets the history mode from the database
   *
   * @returns the history mode
   */
  async getHistoryMode(): Promise<HistoryMode> {
    return (await this.getSetting<HistoryMode>(SettingIds.HistoryMode, HistoryMode.SIMPLE))!;
  }

  /**
   * Sets the history mode in the database
   *
   * @param historyMode the history mode
   */
  async setHistoryMode(historyMode: HistoryMode) {
    await this.setSetting(SettingIds.HistoryMode, historyMode);
  }

  /**
   * Exports the settings from the database
   *
   * @returns the settings
   */
  async exportSettings(): Promise<string> {
    return JSON.stringify({
      version: this.verno,
      settings: await this.settings.toArray(),
    });
  }

  /**
   * Imports the settings from the database
   *
   * @param settings the settings
   */
  async importSettings(settings: string) {
    const parsed = JSON.parse(settings);
    if (parsed.version !== this.verno) {
      throw new Error("Invalid settings version");
    }

    for (const setting of parsed.settings) {
      await this.setSetting(setting.id, setting.value);
    }
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

// Singleton database instance
let databaseInstance: Database | undefined;

/**
 * Gets the database (singleton pattern)
 *
 * @returns the database
 */
export function getDatabase(): Database {
  if (!databaseInstance) {
    const before = performance.now();
    databaseInstance = new Database(before);
  }
  return databaseInstance;
}
