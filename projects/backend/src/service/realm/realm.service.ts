import { NotFoundError } from "@ssr/common/error/not-found-error";
import { sortPpCurve } from "@ssr/common/leaderboard-curve/pp-curve";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { RealmPpCurveResponse } from "@ssr/common/schemas/response/realm/realm-pp-curve";
import { RealmsResponse } from "@ssr/common/schemas/response/realm/realms";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";
import CacheService, { CacheId } from "../infra/cache.service";

export class RealmService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Realm");

  /**
   * Gets all of the realms.
   *
   * @returns the realms
   */
  public static async getRealms(): Promise<RealmsResponse> {
    return CacheService.fetch(CacheId.SCORESABER_REALMS, "realms", async () => {
      const realms = await ScoreSaberApiService.lookupRealms();
      if (realms === undefined) {
        throw new NotFoundError("Unable to fetch realms from ScoreSaber");
      }
      return realms.sort((a, b) => a.id - b.id);
    });
  }

  /**
   * Gets the IDs of every realm, falling back to just the default realm when the realms cannot be
   * fetched so ingestion is not blocked by a ScoreSaber outage.
   *
   * @returns the realm IDs in ascending order
   */
  public static async getRealmIds(): Promise<number[]> {
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
  public static async getRealmPpCurve(realmId: number): Promise<RealmPpCurveResponse> {
    return CacheService.fetch(CacheId.SCORESABER_REALM_PP_CURVE, `realm:${realmId}:pp-curve`, async () => {
      const curve = await ScoreSaberApiService.lookupRealmPpCurve(realmId);
      if (curve === undefined) {
        throw new NotFoundError(`Pp curve for realm "${realmId}" not found`);
      }
      return {
        curve: sortPpCurve(curve.curve),
        positiveModifierCurve: sortPpCurve(curve.positiveModifierCurve),
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
  public static async getCalculationCurve(realmId: number = DEFAULT_REALM_ID) {
    try {
      return (await RealmService.getRealmPpCurve(realmId)).curve;
    } catch (error) {
      RealmService.logger.warn(`Falling back to the default pp curve for realm "${realmId}": ${error}`);
      return ScoreSaberCurve.DEFAULT_CURVE;
    }
  }
}
