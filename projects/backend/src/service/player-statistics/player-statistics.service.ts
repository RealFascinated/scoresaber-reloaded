import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberPlayerStatistics } from "@ssr/common/schemas/scoresaber/player/statistics";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberAccountsTable, scoreSaberScoresTable } from "../../db/schema";
import { PlayerRankedService } from "../player/player-ranked.service";

export class PlayerStatisticsService {
  /**
   * Inserts a new player statistics entry into the database.
   *
   * @param playerId the ID of the player to insert the statistics for
   * @returns the inserted statistics
   */
  public static async getStatistics(playerToken: ScoreSaberPlayerToken): Promise<ScoreSaberPlayerStatistics> {
    const playerId = playerToken.id;
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
    const [scoreStats] = await db
      .select({
        totalScore: sql<number>`(coalesce(sum(${scoreSaberScoresTable.score}), 0))::double precision`,
        totalRankedScore: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 then ${scoreSaberScoresTable.score} else 0 end), 0))::double precision`,
        totalRankedScores: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 then 1 else 0 end), 0))::double precision`,
        totalUnrankedScores: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} = 0 then 1 else 0 end), 0))::double precision`,
        totalScores: sql<number>`(coalesce(count(*), 0))::double precision`,
        averageRankedAccuracy: sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} > 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageUnrankedAccuracy: sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} = 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageAccuracy: sql<number>`coalesce(avg(${scoreSaberScoresTable.accuracy}), 0)`,
        aPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 70 and ${scoreSaberScoresTable.accuracy} < 80 then 1 else 0 end), 0))::double precision`,
        sPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 80 and ${scoreSaberScoresTable.accuracy} < 85 then 1 else 0 end), 0))::double precision`,
        spPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 85 and ${scoreSaberScoresTable.accuracy} < 90 then 1 else 0 end), 0))::double precision`,
        ssPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 90 and ${scoreSaberScoresTable.accuracy} < 95 then 1 else 0 end), 0))::double precision`,
        sspPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 95 and ${scoreSaberScoresTable.accuracy} < 98 then 1 else 0 end), 0))::double precision`,
        godPlays: sql<number>`(coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 98 then 1 else 0 end), 0))::double precision`,
      })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gte(scoreSaberScoresTable.accuracy, 0)));
    return scoreStats;
  }
}
