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
    avatar: row.avatar,
    country: row.country,
    peakRank:
      row.peakRank && row.peakRankTimestamp
        ? { rank: row.peakRank, timestamp: new Date(row.peakRankTimestamp) }
        : undefined,
    seededScores: row.seededScores,
    seededBeatLeaderScores: row.seededBeatLeaderScores,
    cachedProfilePicture: row.cachedProfilePicture,
    trackReplays: row.trackReplays,
    inactive: row.inactive,
    banned: row.banned,
    hmd: row.hmd,
    pp: row.pp,
    medals: row.medals,
    medalsRank: row.medalsRank,
    medalsCountryRank: row.medalsCountryRank,
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    trackedSince: row.trackedSince?.toISOString(),
    joinedDate: row.joinedDate?.toISOString(),
  });
}
