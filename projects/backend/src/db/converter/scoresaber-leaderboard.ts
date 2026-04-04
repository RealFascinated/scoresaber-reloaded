import { env } from "@ssr/common/env";
import { getS3BucketName, StorageBucket } from "@ssr/common/minio-buckets";
import {
  ScoreSaberLeaderboard,
  ScoreSaberLeaderboardSchema,
} from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberLeaderboardStatus } from "@ssr/common/schemas/scoresaber/leaderboard/status";
import { ScoreSaberLeaderboardRow } from "../schema";

export type LeaderboardDifficultyJoinRow = {
  leaderboard: ScoreSaberLeaderboardRow;
  difficulties?: ScoreSaberLeaderboardRow | null;
};

export function leaderboardRowToType(
  row: ScoreSaberLeaderboardRow,
  difficulties?: ScoreSaberLeaderboard["difficulties"]
): ScoreSaberLeaderboard {
  const difficulty = {
    id: row.id,
    difficulty: row.difficulty,
    characteristic: row.characteristic,
  };

  const status: ScoreSaberLeaderboardStatus = row.ranked ? "Ranked" : row.qualified ? "Qualified" : "Unranked";

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
      difficulties: difficulties ?? [],
      maxScore: row.maxScore,
      ranked: row.ranked,
      qualified: row.qualified,
      stars: row.stars ?? 0,
      rankedDate: row.rankedDate ?? undefined,
      qualifiedDate: row.qualifiedDate ?? undefined,
      status,
      plays: row.plays,
      dailyPlays: row.dailyPlays,
      timestamp: row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
    },
    { reportInput: true }
  );
}

export function mergeJoinedLeaderboardRows(rows: LeaderboardDifficultyJoinRow[]): ScoreSaberLeaderboard[] {
  const acc = new Map<number, { main: ScoreSaberLeaderboardRow; difficulties: Map<number, ScoreSaberLeaderboardRow> }>();
  const order: number[] = [];

  for (const { leaderboard, difficulties } of rows) {
    if (!acc.has(leaderboard.id)) {
      order.push(leaderboard.id);
      acc.set(leaderboard.id, { main: leaderboard, difficulties: new Map() });
    }
    if (difficulties) {
      acc.get(leaderboard.id)!.difficulties.set(difficulties.id, difficulties);
    }
  }

  return order.map(id => {
    const { main, difficulties } = acc.get(id)!;
    const picks = difficulties.size > 0
      ? [...difficulties.values()].map(row => ({
        id: row.id,
        difficulty: row.difficulty,
        characteristic: row.characteristic,
      }))
      : undefined;
    return leaderboardRowToType(main, picks);
  });
}