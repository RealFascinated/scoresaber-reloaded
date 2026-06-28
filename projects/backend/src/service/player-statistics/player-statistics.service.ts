import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberPlayerStatistics } from "@ssr/common/schemas/scoresaber/player/statistics";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/v1/player";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberAccountsTable } from "../../db/schema";
import {
  ScoreSaberScoresRepository,
} from "../../repositories/scoresaber-scores.repository";
import CacheService, { CacheId } from "../infra/cache.service";
import { PlayerRankedService } from "../player/player-ranked.service";

export class PlayerStatisticsService {
  /**
   * Inserts a new player statistics entry into the database.
   *
   * @param playerId the ID of the player to insert the statistics for
   * @returns the inserted statistics
   */
  public static async getStatistics(playerToken: ScoreSaberPlayerToken): Promise<ScoreSaberPlayerStatistics> {
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

    const [scoreStats, plusOne] = await Promise.all([
      PlayerStatisticsService.getScoreStats(playerId),
      PlayerRankedService.getPlayerPlusOnePp(playerId),
    ]);

    return {
      // Rank stats
      rank: playerToken.rank,
      countryRank: playerToken.countryRank,

      // Medals stats
      medals: account.medals,

      // PP stats
      pp: playerToken.pp,
      plusOnePp: plusOne,

      // Score stats
      totalScore: scoreStats.totalScore,
      totalRankedScore: scoreStats.totalRankedScore,
      rankedScores: scoreStats.totalRankedScores,
      unrankedScores: scoreStats.totalUnrankedScores,
      totalRankedScores: scoreStats.totalRankedScores,
      totalUnrankedScores: scoreStats.totalUnrankedScores,
      totalScores: scoreStats.totalScores,
      replaysWatched: playerToken.scoreStats.replaysWatched,

      // Accuracy stats
      averageRankedAccuracy: scoreStats.averageRankedAccuracy,
      averageUnrankedAccuracy: scoreStats.averageUnrankedAccuracy,
      averageAccuracy: scoreStats.averageAccuracy,

      // Ranked play stats
      aPlays: scoreStats.aPlays,
      sPlays: scoreStats.sPlays,
      spPlays: scoreStats.spPlays,
      ssPlays: scoreStats.ssPlays,
      sspPlays: scoreStats.sspPlays,
      godPlays: scoreStats.godPlays,
    };
  }

  private static async getScoreStats(playerId: string) {
    return CacheService.fetch(CacheId.PLAYER_SCORE_STATISTICS, playerId, async () => {
      return ScoreSaberScoresRepository.getPlayerScoreStatistics(playerId);
    });
  }
}
