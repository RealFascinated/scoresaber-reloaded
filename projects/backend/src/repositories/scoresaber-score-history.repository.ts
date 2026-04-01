import { and, asc, desc, eq, getTableColumns, lt, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { db } from "../db";
import { scoreSaberScoreHistoryTable, scoreSaberScoresTable, type ScoreSaberScoreRow } from "../db/schema";

const scoreCols = getTableColumns(scoreSaberScoresTable);
const histCols = getTableColumns(scoreSaberScoreHistoryTable);

/** History rows projected to match `scoresaber-scores` columns for UNION with current scores. */
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
  public static async insertSnapshot(
    previous: ScoreSaberScoreRow,
    playerId: string,
    leaderboardId: number
  ): Promise<void> {
    await db
      .insert(scoreSaberScoreHistoryTable)
      .values({
        playerId,
        leaderboardId,
        scoreId: previous.scoreId,
        difficulty: previous.difficulty,
        characteristic: previous.characteristic,
        score: previous.score,
        accuracy: previous.accuracy,
        pp: previous.pp,
        missedNotes: previous.missedNotes,
        badCuts: previous.badCuts,
        maxCombo: previous.maxCombo,
        fullCombo: previous.fullCombo,
        modifiers: previous.modifiers?.length ? previous.modifiers : null,
        hmd: previous.hmd,
        rightController: previous.rightController,
        leftController: previous.leftController,
        timestamp: previous.timestamp,
      })
      .onConflictDoNothing({
        target: [
          scoreSaberScoreHistoryTable.leaderboardId,
          scoreSaberScoreHistoryTable.playerId,
          scoreSaberScoreHistoryTable.score,
        ],
      });
  }

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

  public static async getApproximateTotalRowCount(): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
      SELECT GREATEST(0, reltuples)::bigint::integer AS count
      FROM pg_class
      WHERE oid = 'scoresaber-score-history'::regclass
    `);
    return Number(result.rows[0]?.count ?? 0);
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

  public static async selectCombinedScoresPageForPlayerMap(
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

  public static async selectAccuracySeriesForPlayerMap(
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

  public static async selectPpAccuracyByLeaderboardId(
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

  public static async batchUpdatePpByIds(updates: { id: number; newPp: number }[]): Promise<void> {
    if (updates.length === 0) return;
    await Promise.all(
      updates.map(u =>
        db
          .update(scoreSaberScoreHistoryTable)
          .set({ pp: u.newPp })
          .where(eq(scoreSaberScoreHistoryTable.id, u.id))
      )
    );
  }
}
