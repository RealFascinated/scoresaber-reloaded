import { NotFoundError } from "@ssr/common/error/not-found-error";
import { sortPpCurve } from "@ssr/common/leaderboard-curve/pp-curve";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";

export class RealmService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Realm");

  /**
   * Gets all of the realms.
   *
   * @returns the realms
   */
  public static async getRealms() {
    return CacheService.fetch(CacheId.SCORESABER_REALMS, "realms", async () => {
      const result = await ScoreSaberApiService.lookupRealms();
      if (!result.ok) {
        if (result.error === "not_found") {
          throw new NotFoundError("Realms not found on ScoreSaber");
        }
        throw new Error(`Unable to fetch realms from ScoreSaber: ${result.message}`);
      }
      return result.response.sort((a, b) => a.id - b.id);
    });
  }

  /**
   * Gets the IDs of every realm, falling back to just the default realm when the realms cannot be
   * fetched so ingestion is not blocked by a ScoreSaber outage.
   *
   * @returns the realm IDs in ascending order
   */
  public static async getRealmIds() {
    try {
      return (await RealmService.getRealms()).map(realm => realm.id);
    } catch (error) {
      RealmService.logger.warn(`Falling back to the default realm only: ${error}`);
      return [DEFAULT_REALM_ID];
    }
  }

  /**
   * Gets the pp curve of a realm.
   *
   * @param realmId the ID of the realm
   * @returns the pp curve of the realm, sorted by ascending accuracy
   */
  public static async getRealmPpCurve(realmId: number) {
    return CacheService.fetch(CacheId.SCORESABER_REALM_PP_CURVE, `realm:${realmId}:pp-curve`, async () => {
      const result = await ScoreSaberApiService.lookupRealmPpCurve(realmId);
      if (!result.ok) {
        if (result.error === "not_found") {
          throw new NotFoundError(`Pp curve for realm "${realmId}" not found`);
        }
        throw new Error(`Unable to fetch pp curve for realm "${realmId}": ${result.message}`);
      }
      return {
        curve: sortPpCurve(result.response.curve),
        positiveModifierCurve: sortPpCurve(result.response.positiveModifierCurve),
      };
    });
  }

  /**
   * Gets the pp curve points to use for pp calculations in a realm. Falls back to the
   * built-in default curve when the realm's curve cannot be fetched, so score ingestion
   * is not blocked by a ScoreSaber outage.
   *
   * @param realmId the ID of the realm
   * @returns the curve points, sorted by ascending accuracy
   */
  public static async getCalculationCurve(realmId: number) {
    try {
      return (await RealmService.getRealmPpCurve(realmId)).curve;
    } catch (error) {
      RealmService.logger.warn(`Falling back to the default pp curve for realm "${realmId}": ${error}`);
      return ScoreSaberCurve.DEFAULT_CURVE;
    }
  }
}
