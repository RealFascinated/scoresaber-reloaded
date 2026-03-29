import { env } from "@ssr/common/env";
import { getS3BucketName, StorageBucket } from "@ssr/common/minio-buckets";
import { MapCharacteristic, MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty, MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardSchema,
} from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberLeaderboardStatus } from "@ssr/common/schemas/scoresaber/leaderboard/status";
import { ScoreSaberLeaderboardRow } from "../schema";

export type LeaderboardMainDiffJoinRow = {
  main: ScoreSaberLeaderboardRow;
  difficulties: ScoreSaberLeaderboardRow | null;
};

/**
 * Parses difficulty rows from a main↔difficulties self-join on song hash (deduped by leaderboard id).
 */
export function difficultiesFromLeaderboardJoinRows(
  rows: Array<{ difficulties: ScoreSaberLeaderboardRow | null }>
): { id: number; difficulty: MapDifficulty; characteristic: MapCharacteristic }[] {
  const seen = new Set<number>();
  const out: { id: number; difficulty: MapDifficulty; characteristic: MapCharacteristic }[] = [];
  for (const r of rows) {
    const d = r.difficulties;
    if (!d || seen.has(d.id)) {
      continue;
    }
    seen.add(d.id);
    out.push({
      id: d.id,
      difficulty: MapDifficultySchema.parse(d.difficulty, { reportInput: true }),
      characteristic: MapCharacteristicSchema.parse(d.characteristic, { reportInput: true }),
    });
  }
  return out;
}

/**
 * Groups joined leaderboard rows by main leaderboard id.
 */
export function leaderboardsMapFromJoinedRows(
  rows: LeaderboardMainDiffJoinRow[]
): Map<number, ScoreSaberLeaderboard> {
  const byMainId = new Map<number, LeaderboardMainDiffJoinRow[]>();
  for (const r of rows) {
    let group = byMainId.get(r.main.id);
    if (!group) {
      group = [];
      byMainId.set(r.main.id, group);
    }
    group.push(r);
  }
  const out = new Map<number, ScoreSaberLeaderboard>();
  for (const [id, group] of byMainId) {
    const main = group[0].main;
    const difficulties = difficultiesFromLeaderboardJoinRows(group);
    out.set(id, leaderboardRowToType(main, difficulties));
  }
  return out;
}

/**
 * Preserves row order by first appearance of each main leaderboard id (for ordered list queries).
 */
export function leaderboardsOrderedFromJoinedRows(
  rows: LeaderboardMainDiffJoinRow[]
): ScoreSaberLeaderboard[] {
  const map = leaderboardsMapFromJoinedRows(rows);
  const orderedIds: number[] = [];
  const seen = new Set<number>();
  for (const r of rows) {
    if (!seen.has(r.main.id)) {
      seen.add(r.main.id);
      orderedIds.push(r.main.id);
    }
  }
  return orderedIds.map(id => map.get(id)!);
}

/**
 * Converts a ScoreSaberLeaderboardRow to a ScoreSaberLeaderboard.
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberLeaderboard
 */
export function leaderboardRowToType(
  row: ScoreSaberLeaderboardRow,
  difficulties?: { id: number; difficulty: MapDifficulty; characteristic: MapCharacteristic }[]
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
      songArt: `${env.NEXT_PUBLIC_CDN_URL}/${getS3BucketName(StorageBucket.LeaderboardSongArt)}/${row.songHash}.png`,
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
