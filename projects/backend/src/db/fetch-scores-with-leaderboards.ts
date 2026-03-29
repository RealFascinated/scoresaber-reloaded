import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { asc, eq, getTableColumns, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  groupScoreRowsWithFullLeaderboards,
  type ScoreLeaderboardDifficultyJoinRow,
} from "./converter/scores-with-leaderboards";
import { db } from "./index";
import type { ScoreSaberLeaderboardRow, ScoreSaberScoreRow } from "./schema";
import { scoreSaberLeaderboardsTable, scoreSaberScoresTable } from "./schema";

function normalizeOrder(order: SQL | SQL[]): SQL[] {
  return Array.isArray(order) ? order : [order];
}

export type ScorePageOrderFn = (scores: typeof scoreSaberScoresTable) => SQL | SQL[];

export type FetchScoresWithLeaderboardsOptions = {
  where: SQL | undefined;
  orderBy: ScorePageOrderFn;
  limit: number;
  offset: number;
  /**
   * When set, the outer query omits `ORDER BY` on the expanded join (large sort on many rows).
   * Results are ordered by sorting the ~25 scores in memory instead.
   */
  sortGroupedScores?: (a: ScoreSaberScoreRow, b: ScoreSaberScoreRow) => number;
};

/**
 * Fetches a page of scores plus full {@link ScoreSaberLeaderboard} objects (all difficulties for each song)
 * in a single database round-trip: score subquery → main/difficulties self-join on `songHash`.
 *
 * `orderBy` is applied to the scores table inside the subquery and mirrored on the outer query (plus
 * stable tie-breakers on `scoreId` / difficulty id). Only reference {@link scoreSaberScoresTable} columns
 * in `orderBy` (no leaderboard joins here — use a dedicated query if you must sort on leaderboard fields).
 */
export async function fetchScoresWithLeaderboards(
  options: FetchScoresWithLeaderboardsOptions
): Promise<Array<{ scoreRow: ScoreSaberScoreRow; leaderboard: ScoreSaberLeaderboard }>> {
  const innerOrder = normalizeOrder(options.orderBy(scoreSaberScoresTable));
  const topScores = db
    .select(getTableColumns(scoreSaberScoresTable))
    .from(scoreSaberScoresTable)
    .where(options.where ?? sql`true`)
    .orderBy(...innerOrder)
    .limit(options.limit)
    .offset(options.offset)
    .as("top_scores");

  const main = alias(scoreSaberLeaderboardsTable, "main");
  const difficulties = alias(scoreSaberLeaderboardsTable, "difficulties");

  const outerOrder = [
    ...normalizeOrder(options.orderBy(topScores as unknown as typeof scoreSaberScoresTable)),
    asc(topScores.id),
    asc(difficulties.id),
  ];

  const baseQuery = db
    .select()
    .from(topScores)
    .innerJoin(main, eq(topScores.leaderboardId, main.id))
    .leftJoin(difficulties, eq(main.songHash, difficulties.songHash));

  const flatRows = await (options.sortGroupedScores ? baseQuery : baseQuery.orderBy(...outerOrder));

  const rows: ScoreLeaderboardDifficultyJoinRow[] = flatRows.map(row => {
    const r = row as {
      top_scores: ScoreSaberScoreRow;
      main: ScoreSaberLeaderboardRow;
      difficulties: ScoreSaberLeaderboardRow | null;
    };
    return {
      score: r.top_scores,
      main: r.main,
      difficulties: r.difficulties,
    };
  });

  return groupScoreRowsWithFullLeaderboards(rows, {
    sortGroupedScores: options.sortGroupedScores,
  });
}
