import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import type { ReweightLeaderboardChange } from "@ssr/common/schemas/reweight/reweight";
import { formatDate } from "@ssr/common/utils/time-utils";
import type { ReweightStarChangeRow } from "../../repositories/scoresaber-reweight.repository";

/**
 * Star changes made within this long of the previous one belong to the same reweight. ScoreSaber
 * does not re-rate every map in the same ranked sync, so a reweight trickles in over a few days.
 */
export const REWEIGHT_MERGE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/** pp changes smaller than this are rounding noise and are not recorded. */
export const PP_CHANGE_EPSILON = 1e-6;

export type PpChange = {
  ppBefore: number;
  ppAfter: number;
};

export type PlayerPpChange = PpChange & {
  ppDelta: number;
};

/**
 * Gets the earliest end a reweight can have and still absorb a star change made at `timestamp`.
 */
export function getMergeCutoff(timestamp: Date): Date {
  return new Date(timestamp.getTime() - REWEIGHT_MERGE_WINDOW_MS);
}

/**
 * Gets the display name of a reweight, e.g. "January 2026 Reweight".
 *
 * @param name the stored name override, if any
 * @param startedAt when the reweight started
 */
export function getReweightName(name: string | null, startedAt: Date): string {
  return name ?? `${formatDate(startedAt, "MMMM YYYY")} Reweight`;
}

/**
 * Whether a score's pp changed enough to be worth recording.
 */
export function hasPpChanged(change: PpChange): boolean {
  return Math.abs(change.ppAfter - change.ppBefore) > PP_CHANGE_EPSILON;
}

/**
 * Collapses the star changes of a reweight to one entry per leaderboard, from the first previous
 * to the last new star rating, for maps that were re-rated more than once in the window. The biggest
 * star gains come first and the biggest drops (including unranks) last.
 *
 * @param rows the reweight's star changes, oldest first
 */
export function aggregateLeaderboardChanges(rows: ReweightStarChangeRow[]): ReweightLeaderboardChange[] {
  const byLeaderboard = new Map<number, ReweightLeaderboardChange>();

  for (const row of rows) {
    const existing = byLeaderboard.get(row.leaderboardId);
    if (existing) {
      existing.newStars = row.newStars;
      continue;
    }
    byLeaderboard.set(row.leaderboardId, {
      leaderboardId: row.leaderboardId,
      songHash: row.songHash,
      songName: row.songName,
      songSubName: row.songSubName,
      songAuthorName: row.songAuthorName,
      levelAuthorName: row.levelAuthorName,
      difficulty: row.difficulty,
      characteristic: row.characteristic,
      previousStars: row.previousStars,
      newStars: row.newStars,
    });
  }

  return [...byLeaderboard.values()].sort(
    (a, b) =>
      b.newStars - b.previousStars - (a.newStars - a.previousStars) || a.leaderboardId - b.leaderboardId
  );
}

/**
 * Works out how a reweight changed a player's total pp.
 *
 * @param unchangedPps the pp of the player's ranked scores the reweight did not change
 * @param changes the pp before and after of the scores the reweight changed. A score that is
 *   worth no pp on one side has 0 there.
 */
export function calculatePlayerPpChange(unchangedPps: number[], changes: PpChange[]): PlayerPpChange {
  const total = (changed: number[]): number =>
    ScoreSaberCurve.getTotalWeightedPp(
      [...unchangedPps, ...changed].filter(pp => pp > 0).sort((a, b) => b - a)
    );

  const ppBefore = total(changes.map(change => change.ppBefore));
  const ppAfter = total(changes.map(change => change.ppAfter));
  return { ppBefore, ppAfter, ppDelta: ppAfter - ppBefore };
}
