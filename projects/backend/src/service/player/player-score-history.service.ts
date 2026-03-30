import { NotFoundError } from "@ssr/common/error/not-found-error";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import { ScoreHistoryGraph } from "@ssr/common/schemas/response/score/score-history-graph";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberHistoryScore } from "@ssr/common/schemas/scoresaber/score/history-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { scoreSaberScoreHistoryTable, scoreSaberScoresTable } from "../../db/schema";
import CacheService, { CacheId } from "../cache.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";

function allScoresQuery(playerId: string, leaderboardId: number) {
  return sql`
    SELECT * FROM "scoresaber-scores"
    WHERE "playerId" = ${playerId} AND "leaderboardId" = ${leaderboardId}
    UNION ALL
    SELECT * FROM "scoresaber-score-history"
    WHERE "playerId" = ${playerId} AND "leaderboardId" = ${leaderboardId}
  `;
}

export class PlayerScoreHistoryService {
  /**
   * Gets the player's score history for a map.
   *
   * @param playerId the player's id to get the previous scores for
   * @param leaderboardId the leaderboard to get the previous scores on
   * @param page the page to get
   */
  public static async getPlayerScoreHistory(
    playerId: string,
    leaderboardId: number,
    page: number
  ): Promise<Page<ScoreSaberScore>> {
    const leaderboard = await LeaderboardCoreService.getLeaderboard(leaderboardId);
    if (!leaderboard) {
      throw new NotFoundError(`Leaderboard "${leaderboardId}" not found`);
    }

    const limit = 8;
    const offset = (page - 1) * limit;

    const countResult = await db.execute<{ total: number }>(sql`
      SELECT COUNT(*)::integer as total FROM (${allScoresQuery(playerId, leaderboardId)}) combined
    `);
    const total = countResult.rows[0]?.total ?? 0;

    if (total === 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    const pagination = new Pagination<ScoreSaberScore>().setItemsPerPage(limit).setTotalItems(total);

    return pagination.getPage(page, async () => {
      const rawScores = await db.execute<typeof scoreSaberScoresTable.$inferSelect>(sql`
        SELECT * FROM (${allScoresQuery(playerId, leaderboardId)}) combined
        ORDER BY timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      return Promise.all(
        rawScores.rows.map(async row => {
          const score = scoreSaberScoreRowToType(row);
          const enriched = await ScoreCoreService.insertScoreData(score, leaderboard, {
            insertPreviousScore: false,
          });
          return enriched;
        })
      );
    });
  }

  /**
   * Gets the player's previous score for a map.
   *
   * @param score the score to get the previous score for
   * @param leaderboard the leaderboard to get the previous score on
   * @param timestamp the timestamp to get the previous score at
   * @returns the previous score
   */
  public static async getPlayerPreviousScore(
    score: ScoreSaberScore,
    leaderboard: ScoreSaberLeaderboard
  ): Promise<ScoreSaberHistoryScore | undefined> {
    return CacheService.fetch(
      CacheId.PreviousScore,
      `previous-score:${score.playerId}-${score.scoreId}`,
      async () => {
        const [previousScore] = await db
          .select()
          .from(scoreSaberScoreHistoryTable)
          .where(
            and(
              eq(scoreSaberScoreHistoryTable.playerId, score.playerId),
              eq(scoreSaberScoreHistoryTable.leaderboardId, leaderboard.id),
              lt(scoreSaberScoreHistoryTable.timestamp, score.timestamp)
            )
          )
          .orderBy(desc(scoreSaberScoreHistoryTable.timestamp))
          .limit(1);

        if (!previousScore || previousScore.scoreId === score.scoreId) {
          return undefined;
        }

        return {
          ...scoreSaberScoreRowToType(previousScore),
          change: {
            score: score.score - previousScore.score,
            accuracy: score.accuracy - previousScore.accuracy,
            misses: score.misses - previousScore.missedNotes - previousScore.badCuts,
            missedNotes: score.missedNotes - previousScore.missedNotes,
            badCuts: score.badCuts - previousScore.badCuts,
            maxCombo: score.maxCombo - previousScore.maxCombo,
          },
        } as ScoreSaberHistoryScore;
      }
    );
  }

  public static async getPlayerScoreHistoryGraph(
    playerId: string,
    leaderboardId: number
  ): Promise<ScoreHistoryGraph> {
    return CacheService.fetch(
      CacheId.ScoreHistoryGraph,
      `score-history-graph:${playerId}-${leaderboardId}`,
      async () => {
        const scores = await db.execute<{ timestamp: Date; accuracy: number }>(sql`
          SELECT timestamp, accuracy FROM (${allScoresQuery(playerId, leaderboardId)}) combined
          ORDER BY timestamp ASC
        `);

        return scores.rows.map(row => {
          return {
            timestamp: row.timestamp,
            accuracy: row.accuracy,
          };
        });
      }
    );
  }

  /**
   * Gets the total number of previous scores.
   *
   * @returns the total number of previous scores
   */
  public static async getTotalPreviousScoresCount(): Promise<number> {
    const [row] = await db.select({ count: count() }).from(scoreSaberScoreHistoryTable);
    return Number(row?.count ?? 0);
  }
}
