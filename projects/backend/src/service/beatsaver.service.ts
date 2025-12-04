import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { DetailType } from "@ssr/common/detail-type";
import { BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import BeatSaverMapToken from "@ssr/common/types/token/beatsaver/map";
import { getBeatSaverDifficulty } from "@ssr/common/utils/beatsaver.util";
import CacheService, { CacheId } from "./cache.service";
import Logger from "@ssr/common/logger";
import { formatDuration } from "@ssr/common/utils/time-utils";

export default class BeatSaverService {
  /**
   * Gets the raw BeatSaver map for a given hash
   *
   * @param hash the hash of the map
   * @param token the optional token to use
   * @returns the raw BeatSaver map
   */
  public static async getMapToken(hash: string): Promise<BeatSaverMapToken | undefined> {
    const normalizedHash = hash.toLowerCase();

    const map = await BeatSaverMapModel.findOne({
      "versions.hash": normalizedHash,
    });
    if (map) {
      // Fix the id of the map
      map.id = (map as BeatSaverMapToken & { _id?: string })._id ?? map.id;
      return map;
    }

    const before = performance.now();
    const token = await ApiServiceRegistry.getInstance()
      .getBeatSaverService()
      .lookupMap(normalizedHash);
    if (!token) {
      return undefined;
    }

    token.versions.forEach(version => {
      version.hash = version.hash.toLowerCase(); // Ensure the hash is lowercase
    });

    const newMap = await BeatSaverMapModel.findOneAndUpdate(
      { _id: token.id },
      { $set: token },
      { upsert: true, new: true }
    );
    Logger.info(`Created BeatSaver map ${hash} in ${formatDuration(performance.now() - before)}`);
    // Fix the id of the map
    newMap.id = (newMap as BeatSaverMapToken & { _id?: string })._id ?? newMap.id;
    return newMap;
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
    const map =
      token ??
      (await CacheService.fetchWithCache(CacheId.BeatSaver, `beatsaver:${hash}`, async () => {
        return await this.getMapToken(hash);
      }));

    if (!map || map.versions.length === 0) {
      return undefined;
    }

    const response = {
      hash,
      bsr: map.id,
      name: map.name,
      author: {
        avatar: map.uploader?.avatar ?? undefined,
        name: map.uploader?.name ?? undefined,
        id: map.uploader?.id ?? undefined,
      },
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
          version.diffs.forEach(diff => {
            acc[diff.difficulty] = diff.label;
          });
          return acc;
        },
        {} as Record<MapDifficulty, string>
      ),
    } as BeatSaverMapResponse;
  }
}
