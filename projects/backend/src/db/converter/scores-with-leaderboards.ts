import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberLeaderboardRow, ScoreSaberScoreRow } from "../schema";
import { leaderboardsMapFromJoinedRows, type LeaderboardMainDiffJoinRow } from "./scoresaber-leaderboard";

export type ScoreLeaderboardDifficultyJoinRow = {
  score: ScoreSaberScoreRow;
  main: ScoreSaberLeaderboardRow;
  difficulties: ScoreSaberLeaderboardRow | null;
};

/**
 * Groups rows from (scores subquery) ⨝ main leaderboard ⨝ difficulties self-join into one
 * {@link ScoreSaberLeaderboard} per score (with all difficulties for the song).
 *
 * When `sortGroupedScores` is omitted, score order follows the first occurrence of each score `id` in
 * `rows` (use when the SQL query already ordered rows). When set, order of results is sorted in memory
 * (use when skipping an expensive outer `ORDER BY` on the expanded join).
 */
export function groupScoreRowsWithFullLeaderboards(
  rows: ScoreLeaderboardDifficultyJoinRow[],
  options?: {
    sortGroupedScores?: (a: ScoreSaberScoreRow, b: ScoreSaberScoreRow) => number;
  }
): Array<{ scoreRow: ScoreSaberScoreRow; leaderboard: ScoreSaberLeaderboard }> {
  const byScoreId = new Map<number, ScoreLeaderboardDifficultyJoinRow[]>();
  const orderSeen: number[] = [];

  for (const row of rows) {
    const id = row.score.id;
    if (!byScoreId.has(id)) {
      orderSeen.push(id);
      byScoreId.set(id, []);
    }
    byScoreId.get(id)!.push(row);
  }

  if (options?.sortGroupedScores) {
    orderSeen.sort((a, b) =>
      options.sortGroupedScores!(byScoreId.get(a)![0].score, byScoreId.get(b)![0].score)
    );
  }

  const out: Array<{ scoreRow: ScoreSaberScoreRow; leaderboard: ScoreSaberLeaderboard }> = [];
  for (const id of orderSeen) {
    const chunkRows = byScoreId.get(id)!;
    const scoreRow = chunkRows[0].score;
    const joinChunk: LeaderboardMainDiffJoinRow[] = chunkRows.map(r => ({
      main: r.main,
      difficulties: r.difficulties,
    }));
    const map = leaderboardsMapFromJoinedRows(joinChunk);
    const leaderboard = map.get(scoreRow.leaderboardId);
    if (!leaderboard) {
      throw new Error(
        `Leaderboard ${scoreRow.leaderboardId} missing after grouping join rows for score ${scoreRow.id}`
      );
    }
    out.push({ scoreRow, leaderboard });
  }
  return out;
}
