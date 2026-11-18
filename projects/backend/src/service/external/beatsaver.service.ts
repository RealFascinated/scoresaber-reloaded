import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { BeatSaverMapToken } from "@ssr/common/schemas/beatsaver/tokens/map";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import { TimeUnit } from "@ssr/common/utils/time-utils";
import { BatchLoader } from "../../common/batch-loader";
import { beatSaverMapCacheKey, normalizeSongHash } from "../../common/cache-keys";
import { beatSaverRowsToMap } from "../../db/converter/beatsaver-map";
import { BeatSaverRepository } from "../../repositories/beatsaver.repository";
import CacheService, { CacheId } from "../infra/cache.service";

const MISSING_RECHECK_MS = TimeUnit.toMillis(TimeUnit.Day, 1);

export default class BeatSaverService {
  private static readonly mapBundleLoader = new BatchLoader<
    string,
    Awaited<ReturnType<typeof BeatSaverRepository.findMapBundleByVersionHash>>
  >(hashes => BeatSaverRepository.findMapBundlesByVersionHashes(hashes));

  /**
   * Fetches a BeatSaver map
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   * @param token the optional token to use
   * @returns the map response or undefined if not found
   */
  public static async getMap(hash: string, difficulty: MapDifficulty, characteristic: MapCharacteristic) {
    const normalizedHash = normalizeSongHash(hash);
    const cacheKey = beatSaverMapCacheKey(normalizedHash, difficulty, characteristic);

    return CacheService.fetch(CacheId.BEATSAVER_MAP, cacheKey, async () => {
      let rows = await this.mapBundleLoader.load(normalizedHash);

      if (!rows) {
        if (
          await BeatSaverRepository.isMarkedMissing(normalizedHash, new Date(Date.now() - MISSING_RECHECK_MS))
        ) {
          return undefined;
        }
        const lookup = await ApiServiceRegistry.getInstance()
          .getBeatSaverService()
          .lookupMapResult(normalizedHash);
        if (lookup.status === "missing") {
          await BeatSaverRepository.markMissing(normalizedHash);
        }
        if (lookup.status !== "found") {
          return undefined;
        }
        const fetchedToken = lookup.map;
        await this.saveMap(fetchedToken);
        rows = await BeatSaverRepository.findMapBundleByVersionHash(normalizedHash);
        if (!rows) {
          const picked = this.pickVersionForLeaderboard(
            fetchedToken,
            normalizedHash,
            difficulty,
            characteristic
          );
          if (picked != null) {
            rows = await BeatSaverRepository.findMapBundleByVersionHash(picked.hash.toLowerCase());
          }
        }
        if (!rows) {
          return undefined;
        }
      }

      const map = beatSaverRowsToMap({
        hash: rows.version.hash.toLowerCase(),
        characteristic,
        difficulty,
        map: rows.map,
        uploader: rows.uploader,
        version: rows.version,
        difficulties: rows.difficulties,
      });
      return map;
    });
  }

  /**
   * Saves a BeatSaver map to the database
   *
   * @param map the map to save
   * @returns the saved map
   */
  public static async saveMap(map: BeatSaverMapToken) {
    await BeatSaverRepository.upsertMap(map);
  }

  private static pickVersionForLeaderboard(
    token: BeatSaverMapToken,
    songHashNormalized: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ) {
    const versions = token.versions;
    if (versions.length === 0) {
      return undefined;
    }

    const exact = versions.find(v => v.hash.toLowerCase() === songHashNormalized);
    if (exact) {
      return exact;
    }

    const byCreatedDesc = [...versions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const v of byCreatedDesc) {
      if (v.diffs?.some(d => d.characteristic === characteristic && d.difficulty === difficulty)) {
        return v;
      }
    }

    return byCreatedDesc[0];
  }
}
