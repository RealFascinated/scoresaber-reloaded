import { NotFoundError } from "@ssr/common/error/not-found-error";
import type { Page } from "@ssr/common/pagination";
import { Pagination } from "@ssr/common/pagination";
import { ScoreHistoryGraph } from "@ssr/common/schemas/response/score/score-history-graph";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberHistoryScore } from "@ssr/common/schemas/scoresaber/score/history-score";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { and, asc, desc, eq, getTableColumns, lte, ne, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { scoreSaberScoreRowToType } from "../../db/converter/scoresaber-score";
import { scoreSaberScoreHistoryTable, scoreSaberScoresTable } from "../../db/schema";
import CacheService, { CacheId } from "../cache.service";
import { LeaderboardCoreService } from "../leaderboard/leaderboard-core.service";
import { ScoreCoreService } from "../score/score-core.service";

const scoreCols = getTableColumns(scoreSaberScoresTable);
const histCols = getTableColumns(scoreSaberScoreHistoryTable);

/** History row projected to match {@link scoreSaberScoresTable} (`scoreId` → `id`) for UNION + {@link scoreSaberScoreRowToType}. */
const histAsScoreCols = Object.fromEntries(
  Object.keys(scoreCols).map(name => [
    name,
    name === "id" ? histCols.scoreId : histCols[name as keyof typeof histCols],
  ])
) as unknown as typeof scoreCols;

/** Shared filters + full-row UNION for this player/map (only exported helper in this file besides the service). */
function playerMapQueries(playerId: string, leaderboardId: number) {
  const onScores = and(
    eq(scoreSaberScoresTable.playerId, playerId),
    eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
  );
  const onHistory = and(
    eq(scoreSaberScoreHistoryTable.playerId, playerId),
    eq(scoreSaberScoreHistoryTable.leaderboardId, leaderboardId)
  );
  return {
    onScores,
    onHistory,
    fullRowsUnion: unionAll(
      db.select(scoreCols).from(scoreSaberScoresTable).where(onScores),
      db.select(histAsScoreCols).from(scoreSaberScoreHistoryTable).where(onHistory)
    ),
  };
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

    const q = playerMapQueries(playerId, leaderboardId);
    const [scoresCount, historyCount] = await Promise.all([
      db.$count(scoreSaberScoresTable, q.onScores),
      db.$count(scoreSaberScoreHistoryTable, q.onHistory),
    ]);
    const total = scoresCount + historyCount;

    if (total === 0) {
      throw new NotFoundError(`No previous scores found for ${playerId} in ${leaderboardId}`);
    }

    const pagination = new Pagination<ScoreSaberScore>().setItemsPerPage(limit).setTotalItems(total);

    return pagination.getPage(page, async () => {
      const combined = q.fullRowsUnion.as("combined");

      const rawScores = await db
        .select()
        .from(combined)
        .orderBy(desc(sql`"timestamp"`))
        .limit(limit)
        .offset(offset);

      return Promise.all(
        rawScores.map(async row => {
          const scoreRow = scoreSaberScoreRowToType(row as typeof scoreSaberScoresTable.$inferSelect);
          const enriched = await ScoreCoreService.insertScoreData(scoreRow, leaderboard, {
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
              ne(scoreSaberScoreHistoryTable.scoreId, score.scoreId),
              lte(scoreSaberScoreHistoryTable.timestamp, score.timestamp)
            )
          )
          .orderBy(desc(scoreSaberScoreHistoryTable.timestamp))
          .limit(1);

        if (!previousScore) {
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
        const { onScores, onHistory } = playerMapQueries(playerId, leaderboardId);

        const graph = unionAll(
          db
            .select({
              timestamp: scoreSaberScoresTable.timestamp,
              accuracy: scoreSaberScoresTable.accuracy,
            })
            .from(scoreSaberScoresTable)
            .where(onScores),
          db
            .select({
              timestamp: scoreSaberScoreHistoryTable.timestamp,
              accuracy: scoreSaberScoreHistoryTable.accuracy,
            })
            .from(scoreSaberScoreHistoryTable)
            .where(onHistory)
        ).as("combined");

        const scores = await db.select().from(graph).orderBy(asc(graph.timestamp));

        return scores.map(row => ({
          timestamp: row.timestamp,
          accuracy: row.accuracy,
        }));
      }
    );
  }

  /**
   * Gets the total number of previous scores.
   *
   * @returns the approximate total number of previous scores
   */
  public static async getTotalPreviousScoresCount(): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT GREATEST(0, reltuples)::bigint::integer AS count
      FROM pg_class
      WHERE oid = 'scoresaber-score-history'::regclass
    `);
    return Number(result.rows[0]?.count ?? 0);
  }
}
