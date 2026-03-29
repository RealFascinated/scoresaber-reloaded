import { Player } from "@ssr/common/model/player/player";
import { ScoreSaberAccount, ScoreSaberAccountSchema } from "@ssr/common/schemas/scoresaber/account";
import { ScoreSaberAccountRow } from "../schema";

/**
 * Converts a `ScoreSaberAccount` (API shape) to the legacy `Player` document shape for services still typed on `Player`.
 */
export function scoreSaberAccountToPlayer(account: ScoreSaberAccount): Player {
  return {
    _id: account.id,
    name: account.name,
    country: account.country ?? undefined,
    peakRank: account.peakRank
      ? { rank: account.peakRank.rank, date: account.peakRank.timestamp }
      : undefined,
    seededScores: account.seededScores,
    seededBeatLeaderScores: account.seededBeatLeaderScores,
    trackReplays: account.trackReplays,
    inactive: account.inactive,
    banned: account.banned,
    hmd: account.hmd,
    pp: account.pp,
    medals: account.medals,
    scoreStats: account.scoreStats,
    trackedSince: account.trackedSince,
    joinedDate: account.joinedDate,
    cachedProfilePicture: account.cachedProfilePicture,
  } as Player;
}

/**
 * Maps a `scoresaber-accounts` row to the legacy `Player` document shape (`_id`, `peakRank.date`, etc.).
 */
export function scoreSaberAccountRowToPlayer(row: ScoreSaberAccountRow): Player {
  return {
    _id: row.id,
    name: row.name,
    country: row.country ?? undefined,
    peakRank:
      row.peakRank != null && row.peakRankTimestamp
        ? { rank: row.peakRank, date: row.peakRankTimestamp }
        : undefined,
    seededScores: row.seededScores,
    seededBeatLeaderScores: row.seededBeatLeaderScores,
    trackReplays: row.trackReplays,
    inactive: row.inactive,
    banned: row.banned,
    hmd: row.hmd ?? undefined,
    pp: row.pp,
    medals: row.medals,
    scoreStats: row.scoreStats,
    trackedSince: row.trackedSince,
    joinedDate: row.joinedDate,
    cachedProfilePicture: row.cachedProfilePicture,
  } as Player;
}

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
    cachedProfilePicture: row.cachedProfilePicture,
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
