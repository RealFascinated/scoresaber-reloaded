import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";
import BeatSaverMapToken from "@ssr/common/types/token/beatsaver/map";
import { beatSaverMapCacheKey, normalizeSongHash } from "../../common/cache-keys";
import { beatSaverRowsToMap } from "../../db/converter/beatsaver-map";
import { BeatSaverRepository } from "../../repositories/beatsaver.repository";
import CacheService, { CacheId } from "../infra/cache.service";

export default class BeatSaverService {
  /**
   * Fetches a BeatSaver map
   *
   * @param hash the hash of the map
   * @param difficulty the difficulty to get
   * @param characteristic the characteristic to get
   * @param token the optional token to use
   * @returns the map response or undefined if not found
   */
  public static async getMap(
    hash: string,
    difficulty: MapDifficulty,
    characteristic: MapCharacteristic
  ): Promise<BeatSaverMap | undefined> {
    const normalizedHash = normalizeSongHash(hash);

    return await CacheService.fetch(
      CacheId.BEATSAVER_MAP_BY_HASH,
      beatSaverMapCacheKey(normalizedHash),
      async () => {
        let rows = await BeatSaverRepository.findMapBundleByVersionHash(normalizedHash);

        if (!rows) {
          const fetchedToken = await ApiServiceRegistry.getInstance()
            .getBeatSaverService()
            .lookupMap(normalizedHash);
          if (!fetchedToken) {
            return undefined;
          }
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
      }
    );
  }

  /**
   * Saves a BeatSaver map to the database
   *
   * @param map the map to save
   * @returns the saved map
   */
  public static async saveMap(map: BeatSaverMapToken): Promise<void> {
    await BeatSaverRepository.upsertMap(map);
  }

  /**
   * When ScoreSaber's `songHash` no longer matches any BeatSaver `version.hash` (e.g. re-upload),
   * BeatSaver may still resolve `/maps/hash/{songHash}` to the map. Pick a version from the token:
   * prefer exact hash match, else newest version that has the requested difficulty, else newest overall.
   */
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
