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
    difficulty: MapDifficultySchema.parse(row.difficulty),
    characteristic: MapCharacteristicSchema.parse(row.characteristic),
  };

  let status: ScoreSaberLeaderboardStatus = "Unranked";
  if (row.qualified) {
    status = "Qualified";
  } else if (row.ranked) {
    status = "Ranked";
  }

  const timestamp = row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp);

  return ScoreSaberLeaderboardSchema.parse({
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
  });
}
