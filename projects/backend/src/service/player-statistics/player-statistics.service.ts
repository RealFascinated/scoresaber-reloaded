import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberPlayerStatistics } from "@ssr/common/schemas/scoresaber/player/statistics";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatDuration } from "@ssr/common/utils/time-utils";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../../db";
import { playerStatisticsRowToType } from "../../db/converter/player-statistics";
import { playerStatisticsTable, scoreSaberAccountsTable, scoreSaberScoresTable } from "../../db/schema";
import { ScoreSaberApiService } from "../external/scoresaber-api.service";

export class PlayerStatisticsService {
  /**
   * Handles a new score for a player. Make sure this is ran AFTER the score is inserted into the database.
   *
   * @param score the score to handle
   */
  public static async handleScoreSaberScore(score: ScoreSaberScore) {
    const [statistics] = await db
      .select({ exists: sql`1` })
      .from(playerStatisticsTable)
      .where(eq(playerStatisticsTable.playerId, score.playerId));
    if (!statistics) {
      const playerToken = await ScoreSaberApiService.lookupPlayer(score.playerId);
      if (!playerToken) {
        throw new NotFoundError(`Player "${score.playerId}" not found`);
      }
      return playerStatisticsRowToType(await PlayerStatisticsService.insert(playerToken));
    }

    const before = performance.now();
    const scoreStats = await PlayerStatisticsService.getScoreStats(score.playerId);
    await db
      .update(playerStatisticsTable)
      .set({
        // Score stats
        totalScore: scoreStats?.totalScore ?? 0,
        totalRankedScore: scoreStats?.totalRankedScore ?? 0,
        rankedScores: scoreStats?.totalRankedScores ?? 0,
        unrankedScores: scoreStats?.totalUnrankedScores ?? 0,
        totalRankedScores: scoreStats?.totalRankedScores ?? 0,
        totalUnrankedScores: scoreStats?.totalUnrankedScores ?? 0,
        totalScores: scoreStats?.totalScores ?? 0,

        // Accuracy stats
        averageRankedAccuracy: scoreStats?.averageRankedAccuracy ?? 0,
        averageUnrankedAccuracy: scoreStats?.averageUnrankedAccuracy ?? 0,
        averageAccuracy: scoreStats?.averageAccuracy ?? 0,

        // Ranked play stats
        aPlays: scoreStats?.aPlays ?? 0,
        sPlays: scoreStats?.sPlays ?? 0,
        spPlays: scoreStats?.spPlays ?? 0,
        ssPlays: scoreStats?.ssPlays ?? 0,
        sspPlays: scoreStats?.sspPlays ?? 0,
        godPlays: scoreStats?.godPlays ?? 0,
      })
      .where(eq(playerStatisticsTable.playerId, score.playerId));
    const after = performance.now();
    console.log(`Handled score and updated player statistics for ${score.playerId} in ${formatDuration(after - before)}`);
  }

  /**
   * Gets the player statistics for a player.
   *
   * @param playerId the ID of the player to get the statistics for
   * @returns the player statistics
   */
  public static async getPlayerStatistics(
    playerToken: ScoreSaberPlayerToken,
    update: boolean = false
  ): Promise<ScoreSaberPlayerStatistics> {
    const [statistics] = await db
      .select()
      .from(playerStatisticsTable)
      .where(eq(playerStatisticsTable.playerId, playerToken.id));
    if (!statistics) {
      return playerStatisticsRowToType(await PlayerStatisticsService.insert(playerToken));
    }

    if (update) {
      return playerStatisticsRowToType(await PlayerStatisticsService.update(playerToken));
    }
    return playerStatisticsRowToType(statistics);
  }

  private static async getScoreStats(playerId: string) {
    const [scoreStats] = await db
      .select({
        totalScore: sql<number>`coalesce(sum(${scoreSaberScoresTable.score}), 0)`,
        totalRankedScore: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 then ${scoreSaberScoresTable.score} else 0 end), 0)`,
        totalRankedScores: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 then 1 else 0 end), 0)`,
        totalUnrankedScores: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} = 0 then 1 else 0 end), 0)`,
        totalScores: sql<number>`coalesce(count(*), 0)`,
        averageRankedAccuracy: sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} > 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageUnrankedAccuracy: sql<number>`coalesce(avg(case when ${scoreSaberScoresTable.pp} = 0 then ${scoreSaberScoresTable.accuracy} end), 0)`,
        averageAccuracy: sql<number>`coalesce(avg(${scoreSaberScoresTable.accuracy}), 0)`,
        aPlays: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 70 and ${scoreSaberScoresTable.accuracy} < 80 then 1 else 0 end), 0)`,
        sPlays: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 80 and ${scoreSaberScoresTable.accuracy} < 85 then 1 else 0 end), 0)`,
        spPlays: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 85 and ${scoreSaberScoresTable.accuracy} < 90 then 1 else 0 end), 0)`,
        ssPlays: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 90 and ${scoreSaberScoresTable.accuracy} < 95 then 1 else 0 end), 0)`,
        sspPlays: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 95 and ${scoreSaberScoresTable.accuracy} < 98 then 1 else 0 end), 0)`,
        godPlays: sql<number>`coalesce(sum(case when ${scoreSaberScoresTable.pp} > 0 and ${scoreSaberScoresTable.accuracy} >= 98 then 1 else 0 end), 0)`,
      })
      .from(scoreSaberScoresTable)
      .where(and(eq(scoreSaberScoresTable.playerId, playerId), gte(scoreSaberScoresTable.accuracy, 0)));
    return scoreStats;
  }

  /**
   * Inserts a new player statistics entry into the database.
   *
   * @param playerId the ID of the player to insert the statistics for
   * @returns the inserted statistics
   */
  public static async insert(playerToken: ScoreSaberPlayerToken) {
    const playerId = playerToken.id;
    const before = performance.now();
    const [account] = await db
      .select({
        medals: scoreSaberAccountsTable.medals,
      })
      .from(scoreSaberAccountsTable)
      .where(eq(scoreSaberAccountsTable.id, playerId));
    if (!account) {
      throw new NotFoundError(`Account "${playerId}" not found`);
    }

    const scoreStats = await PlayerStatisticsService.getScoreStats(playerId);
    const [statistics] = await db
      .insert(playerStatisticsTable)
      .values({
        // Identifiers
        playerId: playerId,

        // Rank stats
        rank: playerToken.rank,
        countryRank: playerToken.countryRank,

        // Medals stats
        medals: account.medals,

        // PP stats
        pp: playerToken.pp,
        plusOnePp: 0,

        // Score stats
        totalScore: scoreStats?.totalScore ?? 0,
        totalRankedScore: scoreStats?.totalRankedScore ?? 0,
        rankedScores: scoreStats?.totalRankedScores ?? 0,
        unrankedScores: scoreStats?.totalUnrankedScores ?? 0,
        totalRankedScores: scoreStats?.totalRankedScores ?? 0,
        totalUnrankedScores: scoreStats?.totalUnrankedScores ?? 0,
        totalScores: scoreStats?.totalScores ?? 0,
        replaysWatched: playerToken.scoreStats.replaysWatched,

        // Accuracy stats
        averageRankedAccuracy: scoreStats?.averageRankedAccuracy ?? 0,
        averageUnrankedAccuracy: scoreStats?.averageUnrankedAccuracy ?? 0,
        averageAccuracy: scoreStats?.averageAccuracy ?? 0,

        // Ranked play stats
        aPlays: scoreStats?.aPlays ?? 0,
        sPlays: scoreStats?.sPlays ?? 0,
        spPlays: scoreStats?.spPlays ?? 0,
        ssPlays: scoreStats?.ssPlays ?? 0,
        sspPlays: scoreStats?.sspPlays ?? 0,
        godPlays: scoreStats?.godPlays ?? 0,
      })
      .returning()
      .onConflictDoUpdate({
        target: [playerStatisticsTable.playerId],
        set: {
          pp: playerToken.pp,
          rank: playerToken.rank,
          countryRank: playerToken.countryRank,
        },
      });
    const after = performance.now();
    console.log(`Inserted player statistics for ${playerId} in ${after - before}ms`);
    return statistics;
  }

  /**
   * Updates a player statistics entry into the database.
   *
   * @param playerToken the token of the player to update the statistics for
   * @returns the updated statistics
   */
  private static async update(playerToken: ScoreSaberPlayerToken) {
    const [statistics] = await db
      .update(playerStatisticsTable)
      .set({
        pp: playerToken.pp,
        rank: playerToken.rank,
        countryRank: playerToken.countryRank,
        replaysWatched: playerToken.scoreStats.replaysWatched,
      })
      .where(eq(playerStatisticsTable.playerId, playerToken.id))
      .returning();
    return statistics;
  }
}
