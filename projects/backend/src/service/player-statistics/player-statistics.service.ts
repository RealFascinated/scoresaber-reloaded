import { NotFoundError } from "@ssr/common/error/not-found-error";
import type { ScoreSaberPlayerLookupToken } from "@ssr/common/schemas/scoresaber/tokens/v2/player/player";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberAccountsTable } from "../../db/schema";
import { ScoreSaberScoresRepository } from "../../repositories/scoresaber-scores.repository";
import CacheService, { CacheId } from "../infra/cache.service";

export class PlayerStatisticsService {
  /**
   * Inserts a new player statistics entry into the database.
   *
   * @param playerToken the player token to build the statistics from, resolved for the realm
   * @param realmId the realm the token's stats and the scores belong to
   * @returns the statistics
   */
  public static async getStatistics(playerToken: ScoreSaberPlayerLookupToken, realmId: number) {
    const playerId = String(playerToken.id);
    const [account] = await db
      .select({
        medals: scoreSaberAccountsTable.medals,
      })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId));
    if (!account) {
      throw new NotFoundError(`Account "${playerId}" not found`);
    }

    const { statistics: scoreStats } = await PlayerStatisticsService.getScoreStats(playerId, realmId);

    return {
      rank: playerToken.stats.rank,
      countryRank: playerToken.stats.countryRank,

      medals: account.medals,

      pp: playerToken.stats.totalPP,
      plusOnePp: playerToken.stats.plusOnePP ?? 0,

      totalScore: scoreStats.totalScore,
      totalRankedScore: scoreStats.totalRankedScore,
      rankedScores: scoreStats.totalRankedScores,
      unrankedScores: scoreStats.totalUnrankedScores,
      totalRankedScores: scoreStats.totalRankedScores,
      totalUnrankedScores: scoreStats.totalUnrankedScores,
      totalScores: scoreStats.totalScores,
      replaysWatched: playerToken.stats.totalReplayViews,

      averageRankedAccuracy: scoreStats.averageRankedAccuracy,
      averageUnrankedAccuracy: scoreStats.averageUnrankedAccuracy,
      averageAccuracy: scoreStats.averageAccuracy,

      aPlays: scoreStats.aPlays,
      sPlays: scoreStats.sPlays,
      spPlays: scoreStats.spPlays,
      ssPlays: scoreStats.ssPlays,
      sspPlays: scoreStats.sspPlays,
      godPlays: scoreStats.godPlays,
    };
  }

  /**
   * Gets the player's score statistics and headset breakdown, read from the database in one pass.
   *
   * @param playerId the player's id
   * @param realmId the realm the statistics are resolved for
   * @returns the score statistics and the per-headset score counts
   */
  public static async getScoreStats(playerId: string, realmId: number) {
    return CacheService.fetch(CacheId.PLAYER_SCORE_STATISTICS, `${playerId}:${realmId}`, async () => {
      return ScoreSaberScoresRepository.getPlayerScoreStatistics(playerId, realmId);
    });
  }
}
