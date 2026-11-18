import { checkSchema, parseSchema } from "@ssr/common/schemas/parse";
import { ScoreSaberAccountSchema } from "@ssr/common/schemas/scoresaber/account";
import { ScoreSaberAccountRow } from "../schema";

/**
 * Converts a ScoreSaberAccountRow to a ScoreSaberAccount.
 *
 * @param row the row to convert
 * @returns the converted ScoreSaberAccount
 */
export function scoreSaberAccountRowToType(row: ScoreSaberAccountRow) {
  const input = {
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
  };

  if (!checkSchema(ScoreSaberAccountSchema, input)) {
    return parseSchema(ScoreSaberAccountSchema, input);
  }
  return {
    ...input,
    country: input.country ?? "Unknown",
    peakRank: input.peakRank && { rank: input.peakRank.rank, timestamp: input.peakRank.timestamp },
    trackedSince: new Date(input.trackedSince),
    joinedDate: new Date(input.joinedDate),
  };
}
