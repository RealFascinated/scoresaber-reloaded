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
const mapUpdateDeduplication: { [key: string]: Promise<BeatSaverMap | undefined> } = {};

export default class BeatSaverService {
  /**
   * Gets a fallback name if the name is empty or null
   *
   * @param name - The name to get
   * @returns The fallback name
   */
  private static getFallbackName(name: string | null): string {
    return !name || name.trim() === "" ? "Unknown" : name;
  }

  /**
   * Finds a map by version hash
   *
   * @param hash the hash to search for
   * @returns the found map document or null
   */
  private static async findMapByVersionHash(hash: string): Promise<BeatSaverMapDocument | null> {
    return BeatSaverMapModel.findOne({ "versions.hash": hash });
  }

  /**
   * Parses a map from a token
   *
   * @param token the token to parse
   * @returns the parsed map
   */
  private static parseMapFromToken(token: BeatSaverMapToken) {
    const { uploader, metadata, versions, id, name, description } = token;
    return {
      bsr: id,
      name,
      description,
      author: {
        id: uploader.id,
        name: uploader.name,
        avatar: uploader.avatar,
      },
      metadata: {
        bpm: metadata.bpm,
        duration: metadata.duration,
        levelAuthorName: this.getFallbackName(metadata.levelAuthorName),
        songAuthorName: this.getFallbackName(metadata.songAuthorName),
        songName: this.getFallbackName(metadata.songName),
        songSubName: this.getFallbackName(metadata.songSubName),
      },
      versions: versions.map(version => ({
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
      })),
      notFound: false,
      lastRefreshed: new Date(),
    };
  }

  /**
   * Creates or updates a map in the database
   *
   * @param hash the hash of the map
   * @param token the optional token to use
   * @returns the created or updated map
   */
  public static async createOrUpdateMap(
    hash: string,
    token?: BeatSaverMapToken
  ): Promise<BeatSaverMap | undefined> {
    const hashUpper = hash.toUpperCase();

    // Deduplicate map updates
    if (hashUpper in mapUpdateDeduplication) {
      return await mapUpdateDeduplication[hashUpper];
    }

    mapUpdateDeduplication[hashUpper] = (async () => {
      const existingMap = await this.findMapByVersionHash(hashUpper);

      // If map exists, return it without updating
      if (existingMap) {
        return existingMap.toObject<BeatSaverMap>();
      }

      // Only create new map if it doesn't exist
      const resolvedToken =
        token || (await ApiServiceRegistry.getInstance().getBeatSaverService().lookupMap(hash));
      if (!resolvedToken) {
        return this.createUnknownMap(hash);
      }

      return this.createNewMap(resolvedToken);
    })();

    const result = await mapUpdateDeduplication[hashUpper];
    delete mapUpdateDeduplication[hashUpper];
    return result;
  }

  /**
   * Creates a new map in the database
   *
   * @param token the token containing the map data
   * @returns the created map
   */
  private static async createNewMap(token: BeatSaverMapToken): Promise<BeatSaverMap> {
    const newMap = new BeatSaverMapModel(this.parseMapFromToken(token));
    await newMap.save();
    return newMap.toObject<BeatSaverMap>();
  }

  /**
   * Persists an unknown map to the database
   *
   * @param hash the hash of the map
   * @returns the created map
   */
  private static async createUnknownMap(hash: string): Promise<BeatSaverMap> {
    const newMap = new BeatSaverMapModel({
      notFound: true,
      versions: [{ hash: hash.toUpperCase() }] as never,
      lastRefreshed: new Date(),
    });

    await newMap.save();
    return newMap.toObject<BeatSaverMap>();
  }

  /**
   * Fetches a BeatSaver map with caching
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   * @param type the type of map to get
   * @param token the optional token to use
   * @returns the map response or undefined if not found
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
      async () => {
        const map = await this.createOrUpdateMap(hash, token);
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
          difficultyLabels: map.versions.reduce(
            (acc, version) => {
              version.difficulties.forEach(diff => {
                acc[diff.difficulty] = diff.label;
              });
              return acc;
            },
            {} as Record<MapDifficulty, string>
          ),
        } as BeatSaverMapResponse;
      }
    );

    const result = await mapDeduplication[cacheKey];
    delete mapDeduplication[cacheKey];
    return result;
  }
}
