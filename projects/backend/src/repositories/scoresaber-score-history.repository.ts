import { chunkArray } from "@ssr/common/utils/utils";
import { and, asc, desc, eq, getTableColumns, inArray, lt, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { db } from "../db";
import {
  ScoreSaberScoreHistoryRow,
  scoreSaberScoreHistoryTable,
  scoreSaberScoresTable,
  type ScoreSaberScoreRow,
} from "../db/schema";
import { TableCountsRepository } from "./table-counts.repository";

export type ScoreHistoryAttemptRow = typeof scoreSaberScoresTable.$inferInsert;

/** Maps a scores-table row to a score-history insert row (used for snapshots of replaced PBs). */
export function scoreRowToHistoryInsert(row: ScoreSaberScoreRow): ScoreHistoryAttemptRow {
  return {
    scoreId: row.scoreId,
    playerId: row.playerId,
    leaderboardId: row.leaderboardId,
    difficulty: row.difficulty,
    characteristic: row.characteristic,
    score: row.score,
    accuracy: row.accuracy,
    pp: row.pp,
    medals: row.medals,
    missedNotes: row.missedNotes,
    badCuts: row.badCuts,
    maxCombo: row.maxCombo,
    fullCombo: row.fullCombo,
    modifiers: row.modifiers,
    hmd: row.hmd,
    rightController: row.rightController,
    leftController: row.leftController,
    timestamp: row.timestamp,
  };
}

const scoreCols = getTableColumns(scoreSaberScoresTable);
const histCols = getTableColumns(scoreSaberScoreHistoryTable);

/** History rows projected to match `scoresaber-scores` columns for UNION with current scores. */
const historyBulkUpdateCasts: Partial<Record<keyof ScoreSaberScoreHistoryRow, string>> = {
  accuracy: "double precision",
  pp: "double precision",
  score: "integer",
  medals: "integer",
  missedNotes: "integer",
  badCuts: "integer",
  maxCombo: "integer",
  leaderboardId: "integer",
  scoreId: "integer",
};

const histAsScoreCols = Object.fromEntries(
  Object.keys(scoreCols).map(name => [name, histCols[name as keyof typeof histCols]])
) as unknown as typeof scoreCols;

function playerMapFilters(playerId: string, leaderboardId: number) {
  const onScores = and(
    eq(scoreSaberScoresTable.playerId, playerId),
    eq(scoreSaberScoresTable.leaderboardId, leaderboardId)
  );
  const onHistory = and(
    eq(scoreSaberScoreHistoryTable.playerId, playerId),
    eq(scoreSaberScoreHistoryTable.leaderboardId, leaderboardId)
  );
  return { onScores, onHistory };
}

export class ScoreSaberScoreHistoryRepository {
  /**
   * Finds a score-history row by its score id.
   */
  public static async findRowByScoreId(scoreId: number): Promise<ScoreSaberScoreHistoryRow | undefined> {
    const [row] = await db
      .select()
      .from(scoreSaberScoreHistoryTable)
      .where(eq(scoreSaberScoreHistoryTable.scoreId, scoreId));
    return row;
  }

  public static async countByPlayerId(playerId: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(scoreSaberScoreHistoryTable)
      .where(eq(scoreSaberScoreHistoryTable.playerId, playerId));
    return Number(row?.count ?? 0);
  }

  /**
   * Returns the score ids already recorded in the history table.
   *
   * Used by the backfill to skip archived plays without per-score lookups.
   */
  public static async findExistingScoreIds(scoreIds: number[]): Promise<Set<number>> {
    if (scoreIds.length === 0) {
      return new Set();
    }
    const rows = await db
      .select({ scoreId: scoreSaberScoreHistoryTable.scoreId })
      .from(scoreSaberScoreHistoryTable)
      .where(inArray(scoreSaberScoreHistoryTable.scoreId, scoreIds));
    return new Set(rows.map(row => row.scoreId));
  }

  public static async insertAttempt(
    row: ScoreHistoryAttemptRow,
    playerId: string,
    leaderboardId: number
  ): Promise<void> {
    await db
      .insert(scoreSaberScoreHistoryTable)
      .values({
        playerId,
        leaderboardId,
        scoreId: row.scoreId,
        difficulty: row.difficulty,
        characteristic: row.characteristic,
        score: row.score,
        accuracy: row.accuracy,
        pp: row.pp,
        medals: row.medals ?? 0,
        missedNotes: row.missedNotes,
        badCuts: row.badCuts,
        maxCombo: row.maxCombo,
        fullCombo: row.fullCombo,
        modifiers: row.modifiers?.length ? row.modifiers : null,
        hmd: row.hmd,
        rightController: row.rightController,
        leftController: row.leftController,
        timestamp: row.timestamp,
      })
      .onConflictDoNothing({
        target: [
          scoreSaberScoreHistoryTable.leaderboardId,
          scoreSaberScoreHistoryTable.playerId,
          scoreSaberScoreHistoryTable.score,
        ],
      });
  }

  /**
   * Finds the latest row before a timestamp.
   *
   * @param playerId the player id
   * @param leaderboardId the leaderboard id
   * @param beforeTimestamp the timestamp to find the latest row before
   * @returns the latest row before the timestamp
   */
  public static async findLatestRowBeforeTimestamp(
    playerId: string,
    leaderboardId: number,
    beforeTimestamp: Date
  ) {
    const [previousScore] = await db
      .select()
      .from(scoreSaberScoreHistoryTable)
      .where(
        and(
          eq(scoreSaberScoreHistoryTable.playerId, playerId),
          eq(scoreSaberScoreHistoryTable.leaderboardId, leaderboardId),
          lt(scoreSaberScoreHistoryTable.timestamp, beforeTimestamp)
        )
      )
      .orderBy(desc(scoreSaberScoreHistoryTable.timestamp))
      .limit(1);
    return previousScore;
  }

  public static async countCombinedScoresForPlayerMap(
    playerId: string,
    leaderboardId: number
  ): Promise<number> {
    const { onScores, onHistory } = playerMapFilters(playerId, leaderboardId);
    const [scoresCount, historyCount] = await Promise.all([
      db.$count(scoreSaberScoresTable, onScores),
      db.$count(scoreSaberScoreHistoryTable, onHistory),
    ]);
    return scoresCount + historyCount;
  }

  public static async getCombinedScoresPageForPlayerMap(
    playerId: string,
    leaderboardId: number,
    limit: number,
    offset: number
  ): Promise<ScoreSaberScoreRow[]> {
    const { onScores, onHistory } = playerMapFilters(playerId, leaderboardId);
    const fullRowsUnion = unionAll(
      db.select(scoreCols).from(scoreSaberScoresTable).where(onScores),
      db.select(histAsScoreCols).from(scoreSaberScoreHistoryTable).where(onHistory)
    );
    const combined = fullRowsUnion.as("combined");
    const rawScores = await db
      .select()
      .from(combined)
      .orderBy(desc(sql`"timestamp"`))
      .limit(limit)
      .offset(offset);
    return rawScores as ScoreSaberScoreRow[];
  }

  public static async getAccuracySeriesForPlayerMap(
    playerId: string,
    leaderboardId: number
  ): Promise<Array<{ timestamp: Date; accuracy: number }>> {
    const { onScores, onHistory } = playerMapFilters(playerId, leaderboardId);
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

  public static async getPpAccuracyByLeaderboardId(
    leaderboardId: number
  ): Promise<{ id: number; pp: number; accuracy: number }[]> {
    return db
      .select({
        id: scoreSaberScoreHistoryTable.id,
        pp: scoreSaberScoreHistoryTable.pp,
        accuracy: scoreSaberScoreHistoryTable.accuracy,
      })
      .from(scoreSaberScoreHistoryTable)
      .where(eq(scoreSaberScoreHistoryTable.leaderboardId, leaderboardId));
  }

  /**
   * Bulk upserts the history scores.
   *
   * Executed as `UPDATE ... FROM (VALUES ...)` statements (one per chunk)
   * instead of one UPDATE per row, which would otherwise issue tens of
   * thousands of round trips — serialized on a single pooled connection —
   * whenever a leaderboard's star rating changes. Chunked to stay within
   * PostgreSQL's parameter limit.
   *
   * @param updates the updates to upsert
   */
  public static async bulkUpsetHistoryScores(updates: Partial<ScoreSaberScoreHistoryRow>[]): Promise<void> {
    const validUpdates = updates.filter(
      (u): u is Partial<ScoreSaberScoreHistoryRow> & { id: number } => u.id !== undefined
    );
    if (validUpdates.length === 0) {
      return;
    }

    // Every row updates the same columns; derive them from the first row. The
    // keys come from the typed Partial<ScoreSaberScoreHistoryRow> passed by
    // callers, so only schema column names are ever interpolated.
    const fields = Object.keys(validUpdates[0]).filter(
      (key): key is keyof ScoreSaberScoreHistoryRow => key !== "id"
    );
    if (fields.length === 0) {
      return;
    }

    // 5,000 rows per chunk => 10,000 parameters, comfortably under the limit.
    await db.transaction(async tx => {
      for (const chunk of chunkArray(validUpdates, 5_000)) {
        await tx.execute(sql`
          UPDATE ${scoreSaberScoreHistoryTable} AS history
          SET ${sql.join(
            fields.map(field => {
              const cast = historyBulkUpdateCasts[field];
              return cast
                ? sql`"${sql.raw(field)}" = values_table.${sql.raw(`"${field}"`)}::${sql.raw(cast)}`
                : sql`"${sql.raw(field)}" = values_table.${sql.raw(`"${field}"`)}`;
            }),
            sql`, `
          )}
          FROM (VALUES ${sql.join(
            chunk.map(
              update =>
                sql`(${update.id}, ${sql.join(
                  fields.map(field => sql`${update[field]}`),
                  sql`, `
                )})`
            ),
            sql`, `
          )}) AS values_table("id", ${sql.join(
            fields.map(field => sql.raw(`"${field}"`)),
            sql`, `
          )})
          WHERE history."id" = values_table."id"::integer
        `);
      }
    });
  }

  public static async countTotal(): Promise<number> {
    const counts = await TableCountsRepository.getCounts();
    return counts.scoresaberScoreHistory;
  }
}
