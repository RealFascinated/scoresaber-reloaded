import { beatsaverService } from "@ssr/common/service/impl/beatsaver";
import { BeatSaverMap, BeatSaverMapModel } from "@ssr/common/model/beatsaver/map";
import { fetchWithCache } from "../common/cache.util";
import CacheService, { ServiceCache } from "./cache.service";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { getBeatSaverDifficulty } from "@ssr/common/utils/beatsaver.util";

export default class BeatSaverService {
  /**
   * Gets a map by its hash, updates if necessary, or inserts if not found.
   *
   * @param hash the hash of the map
   * @returns the beatsaver map, or undefined if not found
   */
  public static async getInternalMap(hash: string): Promise<BeatSaverMap | undefined> {
    let map = await BeatSaverMapModel.findOne({
      "versions.hash": hash.toUpperCase(),
    });

    if (map) {
      const toObject = map.toObject() as BeatSaverMap;

      // If the map is not found, return undefined
      if (toObject.notFound == true) {
        return undefined;
      }

      // todo: impl map refreshing
      return toObject;
    }

    // Map needs to be fetched or refreshed
    const token = await beatsaverService.lookupMap(hash);
    const uploader = token?.uploader;
    const metadata = token?.metadata;

    // Create the new map object based on fetched data
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const newMapData: BeatSaverMap =
      token && uploader && metadata
        ? {
            bsr: token.id,
            name: token.name,
            description: token.description,
            author: {
              id: uploader.id,
              name: uploader.name,
              avatar: uploader.avatar,
            },
            metadata: {
              bpm: metadata.bpm,
              duration: metadata.duration,
              levelAuthorName: metadata.levelAuthorName,
              songAuthorName: metadata.songAuthorName,
              songName: metadata.songName,
              songSubName: metadata.songSubName,
            },
            versions: token.versions.map(version => ({
              hash: version.hash.toUpperCase(),
              difficulties: version.diffs.map(diff => ({
                njs: diff.njs,
                offset: diff.offset,
                notes: diff.notes,
                bombs: diff.bombs,
                obstacles: diff.obstacles,
                nps: diff.nps,
                characteristic: diff.characteristic,
                difficulty: diff.difficulty,
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
            lastRefreshed: new Date(),
          }
        : {
            notFound: true,
          };

    map = await BeatSaverMapModel.create(newMapData);

    if (map == null || map.notFound) {
      return undefined;
    }
    return map.toObject() as BeatSaverMap;
  }

  /**
   * Fetches a BeatSaver map
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   * @returns the map, or undefined if not found
   */
  public static async getMap(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ): Promise<BeatSaverMapResponse | undefined> {
    return fetchWithCache(
      CacheService.getCache(ServiceCache.BeatSaver),
      `map:${hash}-${difficulty}-${characteristic}`,
      async () => {
        const map = await this.getInternalMap(hash);

        if (!map) {
          return undefined;
        }

        return {
          hash,
          bsr: map.bsr,
          name: map.name,
          description: map.description,
          author: map.author,
          metadata: map.metadata,
          difficulty: getBeatSaverDifficulty(map, hash, difficulty, characteristic),
        } as BeatSaverMapResponse;
      }
    );
  }
}
