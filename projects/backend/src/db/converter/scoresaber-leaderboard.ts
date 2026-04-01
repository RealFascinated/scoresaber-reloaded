import { env } from "@ssr/common/env";
import { getS3BucketName, StorageBucket } from "@ssr/common/minio-buckets";
import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardSchema,
} from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberLeaderboardStatus } from "@ssr/common/schemas/scoresaber/leaderboard/status";
import { ScoreSaberLeaderboardRow } from "../schema";

export type LeaderboardDifficultyJoinRow = {
  leaderboard: ScoreSaberLeaderboardRow;
  difficulties: ScoreSaberLeaderboardRow | null;
};

/**
 * Converts a ScoreSaberLeaderboardRow to a ScoreSaberLeaderboard.
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberLeaderboard
 */
export function leaderboardRowToType(
  row: ScoreSaberLeaderboardRow,
  difficulties?: ScoreSaberLeaderboard["difficulties"]
): ScoreSaberLeaderboard {
  const difficulty = {
    id: row.id,
    difficulty: MapDifficultySchema.parse(row.difficulty, { reportInput: true }),
    characteristic: MapCharacteristicSchema.parse(row.characteristic, { reportInput: true }),
  };

  let status: ScoreSaberLeaderboardStatus = "Unranked";
  if (row.qualified) {
    status = "Qualified";
  } else if (row.ranked) {
    status = "Ranked";
  }

  const timestamp = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);

  return ScoreSaberLeaderboardSchema.parse(
    {
      id: row.id,
      fullName: `${row.songName} ${row.songSubName}`.trim(),
      songHash: row.songHash.toUpperCase(),
      songName: row.songName,
      songSubName: row.songSubName,
      songAuthorName: row.songAuthorName,
      levelAuthorName: row.levelAuthorName,
      songArt: row.cachedSongArt
        ? `${env.NEXT_PUBLIC_CDN_URL}/${getS3BucketName(StorageBucket.LeaderboardSongArt)}/${row.songHash}.png`
        : "https://cdn.fascinated.cc/assets/unknown.png",
      difficulty,
      difficulties: difficulties ?? [difficulty],
      maxScore: row.maxScore,
      ranked: row.ranked,
      qualified: row.qualified,
      stars: row.stars ?? 0,
      rankedDate: row.rankedDate ?? undefined,
      qualifiedDate: row.qualifiedDate ?? undefined,
      status,
      plays: row.plays,
      dailyPlays: row.dailyPlays,
      timestamp,
    },
    { reportInput: true }
  );
}
/**
 * Collapses self-joined rows (one row per main×difficulty) into one {@link ScoreSaberLeaderboard} per main row,
 * with `difficulties` filled from the joined side.
 *
 * Output order follows the first occurrence of each main `leaderboard.id` in `rows` (matches `ORDER BY` on the main alias).
 */
export function mergeJoinedLeaderboardRows(rows: LeaderboardDifficultyJoinRow[]): ScoreSaberLeaderboard[] {
  const byMainId = new Map<
    number,
    {
      main: ScoreSaberLeaderboardRow;
      difficultiesById: Map<number, ScoreSaberLeaderboardRow>;
    }
  >();
  const mainIdOrder: number[] = [];

  for (const row of rows) {
    const main = row.leaderboard;
    let acc = byMainId.get(main.id);
    if (!acc) {
      mainIdOrder.push(main.id);
      acc = { main, difficultiesById: new Map() };
      byMainId.set(main.id, acc);
    }
    const d = row.difficulties;
    if (d) {
      acc.difficultiesById.set(d.id, d);
    }
  }

  return mainIdOrder.map(mainId => {
    const acc = byMainId.get(mainId)!;
    const difficultyRows = [...acc.difficultiesById.values()];
    const picks =
      difficultyRows.length > 0
        ? difficultyRows.map(row => ({
            id: row.id,
            difficulty: MapDifficultySchema.parse(row.difficulty, { reportInput: true }),
            characteristic: MapCharacteristicSchema.parse(row.characteristic, { reportInput: true }),
          }))
        : undefined;
    return leaderboardRowToType(acc.main, picks);
  });
}
