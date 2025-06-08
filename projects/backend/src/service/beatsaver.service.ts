import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import {
  BeatSaverMap,
  BeatSaverMapDocument,
  BeatSaverMapModel,
} from "@ssr/common/model/beatsaver/map";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { BeatSaverMapToken } from "@ssr/common/types/token/beatsaver/map";
import { getBeatSaverDifficulty } from "@ssr/common/utils/beatsaver.util";
import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";

const mapDeduplication: { [key: string]: Promise<BeatSaverMapResponse | undefined> } = {};

export default class BeatSaverService {
  /**
   * Checks if a date is older than two weeks
   * @param date - The date to check
   * @returns True if the date is older than two weeks
   */
  private static isOlderThanTwoWeeks(date: Date): boolean {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return date < twoWeeksAgo;
  }

  /**
   * Gets a fallback name if the name is empty or null
   *
   * @param name - The name to get
   * @returns The fallback name
   */
  private static getFallbackName(name: string | null): string {
    if (!name) return "Unknown";
    return name.trim() === "" ? "Unknown" : name;
  }

  /**
   * Updates a map document with data from a BeatSaver token
   * @param mapDoc - The map document to update
   * @param token - The token containing the new data
   */
  private static updateMapFromToken(mapDoc: BeatSaverMapDocument, token: BeatSaverMapToken): void {
    const { uploader, metadata, versions, id, name, description } = token;

    mapDoc.bsr = id;
    mapDoc.name = name;
    mapDoc.description = description;
    mapDoc.author = {
      id: uploader.id,
      name: uploader.name,
      avatar: uploader.avatar,
    };
    mapDoc.metadata = {
      bpm: metadata.bpm,
      duration: metadata.duration,
      levelAuthorName: this.getFallbackName(metadata.levelAuthorName),
      songAuthorName: this.getFallbackName(metadata.songAuthorName),
      songName: this.getFallbackName(metadata.songName),
      songSubName: this.getFallbackName(metadata.songSubName),
    };
    mapDoc.versions = versions.map(version => ({
      hash: version.hash.toUpperCase(),
      difficulties: version.diffs.map(diff => ({
        njs: diff.njs,
        offset: diff.offset,
        notes: diff.notes,
        bombs: diff.bombs,
        obstacles: diff.obstacles,
        nps: diff.nps,
        characteristic: diff.characteristic as MapCharacteristic,
        difficulty: diff.difficulty as MapDifficulty,
        events: diff.events,
        chroma: diff.chroma,
        mappingExtensions: diff.me,
        noodleExtensions: diff.ne,
        cinema: diff.cinema,
        maxScore: diff.maxScore,
        label: diff.label,
      })),
      createdAt: new Date(version.createdAt),
    }));
    mapDoc.notFound = false;
  }

  /**
   * Handles an existing map document
   * @param map - The map document
   * @param hash - The hash of the map
   * @returns The map object or undefined if not found
   */
  private static async handleExistingMap(
    map: BeatSaverMapDocument,
    hash: string
  ): Promise<BeatSaverMap | undefined> {
    const currentMap = map.toObject<BeatSaverMap>();
    if (currentMap.notFound) return undefined;

    const hashUpper = hash.toUpperCase();
    const hashInVersions = currentMap.versions.some(function (v) {
      return v.hash === hashUpper;
    });

    if (!hashInVersions && this.isOlderThanTwoWeeks(currentMap.lastRefreshed)) {
      await this.refreshMapData(map, hash);
    }

    return map.toObject<BeatSaverMap>();
  }

  /**
   * Refreshes map data from BeatSaver
   * @param mapDoc - The map document to refresh
   * @param hash - The hash of the map
   */
  private static async refreshMapData(mapDoc: BeatSaverMapDocument, hash: string): Promise<void> {
    const hashUpper = hash.toUpperCase();
    const token = await ApiServiceRegistry.getBeatSaverService().lookupMap(hash);

    if (token) {
      const hashInToken = token.versions.some(function (v) {
        return v.hash.toUpperCase() === hashUpper;
      });
      this.updateBrokenHashes(mapDoc, hash, hashInToken);
      this.updateMapFromToken(mapDoc, token);
    } else {
      mapDoc.notFound = true;
    }

    mapDoc.lastRefreshed = new Date();
    await mapDoc.save();
  }

  /**
   * Updates broken hashes in a map document
   * @param mapDoc - The map document
   * @param hash - The hash to update
   * @param hashInToken - Whether the hash exists in the token
   */
  private static updateBrokenHashes(
    mapDoc: BeatSaverMapDocument,
    hash: string,
    hashInToken: boolean
  ): void {
    if (hashInToken) {
      mapDoc.brokenHashes = mapDoc.brokenHashes.filter(function (h) {
        return h !== hash;
      });
    } else if (!mapDoc.brokenHashes.includes(hash)) {
      mapDoc.brokenHashes.push(hash);
    }
  }

  /**
   * Gets a map by its hash, updates if necessary, or inserts if not found
   * @param hash - The hash of the map
   * @param token - Optional token to use
   * @returns The BeatSaver map or undefined if not found
   */
  public static async getInternalMap(
    hash: string,
    token?: BeatSaverMapToken
  ): Promise<BeatSaverMap | undefined> {
    const hashUpper = hash.toUpperCase();
    let map = await this.findMapByVersionHash(hashUpper);

    if (map) return this.handleExistingMap(map, hash);

    map = await this.findMapByBrokenHash(hash);
    if (map) return this.handleExistingMap(map, hash);

    return this.createNewMap(hash, token);
  }

  /**
   * Finds a map by version hash
   * @param hash - The hash to search for
   * @returns The found map document or null
   */
  private static async findMapByVersionHash(hash: string): Promise<BeatSaverMapDocument | null> {
    return BeatSaverMapModel.findOne({ "versions.hash": hash });
  }

  /**
   * Finds a map by broken hash
   * @param hash - The hash to search for
   * @returns The found map document or null
   */
  private static async findMapByBrokenHash(hash: string): Promise<BeatSaverMapDocument | null> {
    return BeatSaverMapModel.findOne({ brokenHashes: hash });
  }

  /**
   * Creates a new map in the database
   * @param hash - The hash of the map
   * @param token - Optional token to use
   * @returns The created map or undefined if not found
   */
  private static async createNewMap(
    hash: string,
    token?: BeatSaverMapToken
  ): Promise<BeatSaverMap | undefined> {
    const resolvedToken = token || (await ApiServiceRegistry.getBeatSaverService().lookupMap(hash));
    if (!resolvedToken) {
      return await this.persistUnknownMap(hash);
    }

    const existingMap = await this.handleDuplicateBsr(resolvedToken, hash);
    if (existingMap) return existingMap;

    return this.persistNewMap(resolvedToken, hash);
  }

  /**
   * Handles duplicate BSR entries
   * @param token - The token containing the BSR
   * @param hash - The hash of the map
   * @returns The existing map if found, otherwise undefined
   */
  private static async handleDuplicateBsr(
    token: BeatSaverMapToken,
    hash: string
  ): Promise<BeatSaverMap | undefined> {
    const existingMap = await BeatSaverMapModel.findOne({ bsr: token.id });
    if (!existingMap) return;

    if (!existingMap.brokenHashes.includes(hash)) {
      existingMap.brokenHashes.push(hash);
      await existingMap.save();
    }
    return existingMap.toObject<BeatSaverMap>();
  }

  /**
   * Persists a new map to the database
   * @param token - The token containing the map data
   * @param hash - The hash of the map
   * @returns The created map
   */
  private static async persistNewMap(
    token: BeatSaverMapToken,
    hash: string
  ): Promise<BeatSaverMap> {
    const newMap = new BeatSaverMapModel();
    this.updateMapFromToken(newMap, token);
    newMap.lastRefreshed = new Date();

    if (
      !newMap.versions.some(function (v) {
        return v.hash === hash.toUpperCase();
      })
    ) {
      newMap.brokenHashes.push(hash);
    }

    await newMap.save();
    return newMap.toObject<BeatSaverMap>();
  }

  /**
   * Persists an unknown map to the database
   *
   * @param hash - The hash of the map
   * @returns The created map
   */
  private static async persistUnknownMap(hash: string): Promise<BeatSaverMap> {
    const newMap = new BeatSaverMapModel();
    newMap.notFound = true;
    newMap.versions = [{ hash: hash.toUpperCase() }] as never;
    newMap.lastRefreshed = new Date();
    await newMap.save();
    return newMap.toObject<BeatSaverMap>();
  }

  /**
   * Fetches a BeatSaver map with caching
   * @param hash - The hash of the map
   * @param difficulty - The difficulty to get
   * @param characteristic - The characteristic to get
   * @param token - Optional token to use
   * @returns The map response or undefined if not found
   */
  public static async getMap(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic,
    type: DetailType = DetailType.BASIC,
    token?: BeatSaverMapToken
  ): Promise<BeatSaverMapResponse | undefined> {
    const cacheKey = `map:${hash}-${difficulty}-${characteristic}-${type}`;

    if (cacheKey in mapDeduplication) {
      return await mapDeduplication[cacheKey];
    }

    mapDeduplication[cacheKey] = fetchWithCache(
      CacheService.getCache(ServiceCache.BeatSaver),
      cacheKey,
      async function () {
        const map = await BeatSaverService.getInternalMap(hash, token);
        if (!map || map.versions.length === 0 || map.notFound) {
          return undefined;
        }

        const response = {
          hash,
          bsr: map.bsr,
          name: map.name,
          author: map.author,
        } as BeatSaverMapResponse;

        if (type === DetailType.BASIC) {
          return response;
        }

        return {
          ...response,
          description: map.description,
          metadata: map.metadata,
          songArt: `https://eu.cdn.beatsaver.com/${hash.toLowerCase()}.jpg`,
          difficulty: getBeatSaverDifficulty(map, hash, difficulty, characteristic),
        } as BeatSaverMapResponse;
      }
    );

    const result = await mapDeduplication[cacheKey];
    delete mapDeduplication[cacheKey];
    return result;
  }
}
