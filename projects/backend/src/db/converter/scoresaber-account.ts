import { ScoreSaberAccount, ScoreSaberAccountSchema } from "@ssr/common/schemas/scoresaber/account";
import { ScoreSaberAccountRow } from "../schema";

/**
 * Converts a ScoreSaberAccountRow to a ScoreSaberAccount.
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberAccount
 */
export function scoreSaberAccountRowToType(row: ScoreSaberAccountRow): ScoreSaberAccount {
  return ScoreSaberAccountSchema.parse({
    id: row.id,
    name: row.name,
    country: row.country,
    peakRank: row.peakRank
      ? { rank: row.peakRank, timestamp: row.peakRankTimestamp?.toISOString() }
      : undefined,
    seededScores: row.seededScores,
    seededBeatLeaderScores: row.seededBeatLeaderScores,
    trackReplays: row.trackReplays,
    inactive: row.inactive,
    banned: row.banned,
    hmd: row.hmd,
    pp: row.pp,
    medals: row.medals,
    scoreStats: row.scoreStats,
    trackedSince: row.trackedSince?.toISOString(),
    joinedDate: row.joinedDate?.toISOString(),
  });
}
