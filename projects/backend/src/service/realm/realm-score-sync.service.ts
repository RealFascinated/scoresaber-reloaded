import Logger, { type ScopedLogger } from "@ssr/common/logger";
import { chunkArray } from "@ssr/common/utils/utils";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";

const LEADERBOARD_CONCURRENCY = 5;

export class RealmScoreSyncService {
  private static readonly logger: ScopedLogger = Logger.withTopic("Realm Score Sync");

  /**
   * Syncs a realm's pp for the scores already stored on a leaderboard, using ScoreSaber's v2
   * leaderboard scores. Scores we have not stored are skipped (they are ingested through the
   * regular score paths, which compute the realm pp themselves).
   *
   * @param leaderboardId the leaderboard to sync
   * @param realmId the realm to sync pp for
   * @returns the number of scores whose realm pp was written
   */
  public static async syncLeaderboard(leaderboardId: number, realmId: number): Promise<number> {
    let page = 1;
    let totalPages = 1;
    let written = 0;

    do {
      const response = await ScoreSaberApiService.lookupLeaderboardRealmScores(leaderboardId, page, realmId);
      if (response === undefined) {
        RealmScoreSyncService.logger.warn(
          `Unable to fetch realm "${realmId}" scores for leaderboard "${leaderboardId}" (page ${page})`
        );
        break;
      }
      totalPages = response.metadata.totalPages;
      written += await ScoreSaberScoresRepository.setRealmPpForExistingScores(
        realmId,
        response.data.map(score => ({ scoreId: score.id, pp: score.pp }))
      );
      page++;
    } while (page <= totalPages);

    return written;
  }

  /**
   * Syncs a realm's pp for several leaderboards, a few at a time.
   *
   * @param leaderboardIds the leaderboards to sync
   * @param realmId the realm to sync pp for
   */
  public static async syncLeaderboards(leaderboardIds: number[], realmId: number): Promise<void> {
    let written = 0;
    for (const batch of chunkArray(leaderboardIds, LEADERBOARD_CONCURRENCY)) {
      const results = await Promise.allSettled(
        batch.map(leaderboardId => RealmScoreSyncService.syncLeaderboard(leaderboardId, realmId))
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          written += result.value;
        } else {
          RealmScoreSyncService.logger.warn(
            `Failed to sync realm "${realmId}" scores for leaderboard "${batch[index]}":`,
            result.reason
          );
        }
      });
    }
    RealmScoreSyncService.logger.info(
      `Synced pp for ${written} scores across ${leaderboardIds.length} leaderboards in realm "${realmId}"`
    );
  }
}
