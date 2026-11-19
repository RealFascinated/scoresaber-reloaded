import { env } from "@ssr/common/env";
import type { RankedBatch } from "@ssr/common/schemas/ranked-batch/ranked-batch";
import type { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import type { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import type { ScoreSaberV2RealmToken } from "@ssr/common/schemas/scoresaber/tokens/v2/realm/realm";
import type { SuggestedMap } from "@ssr/common/schemas/suggested-maps/suggested-maps";

export const MAX_TOOL_ROWS = 100;
export const MAX_RANKED_BATCH_ROWS = 500;

export type SiteLinkKind = "player" | "leaderboard" | "score";

/**
 * Builds a website URL for a player, leaderboard or score page.
 */
export function getSiteLinkUrl(
  kind: SiteLinkKind,
  id: string,
  baseUrl: string = env.NEXT_PUBLIC_WEBSITE_URL ?? ""
) {
  const base = baseUrl.replace(/\/+$/, "");
  switch (kind) {
    case "player":
      return `${base}/player/${encodeURIComponent(id)}`;
    case "leaderboard":
      return `${base}/leaderboard/${encodeURIComponent(id)}`;
    case "score":
      return `${base}/score/${encodeURIComponent(id)}`;
  }
}

/**
 * Trims a leaderboard to the fields the model needs, dropping cover art, dates and play counts it does not use.
 */
export function trimLeaderboard(leaderboard: ScoreSaberLeaderboard) {
  return {
    leaderboardId: leaderboard.id,
    songName: leaderboard.songName,
    songSubName: leaderboard.songSubName,
    songAuthorName: leaderboard.songAuthorName,
    levelAuthorName: leaderboard.levelAuthorName,
    songHash: leaderboard.songHash,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
    stars: leaderboard.stars,
    ranked: leaderboard.ranked,
    qualified: leaderboard.qualified,
    maxScore: leaderboard.maxScore,
    plays: leaderboard.plays,
  };
}

export function trimLeaderboards(leaderboards: ScoreSaberLeaderboard[], maxRows: number = MAX_TOOL_ROWS) {
  return leaderboards.slice(0, maxRows).map(trimLeaderboard);
}

/**
 * Trims a score to the fields the model needs, keeping the player name and the score's pp.
 */
export function trimLeaderboardScore(score: ScoreSaberScore) {
  return {
    rank: score.rank,
    playerId: score.playerId,
    playerName: score.playerInfo?.name ?? undefined,
    country: score.playerInfo?.country ?? undefined,
    score: score.score,
    accuracy: score.accuracy,
    pp: score.pp,
    misses: score.misses,
    badCuts: score.badCuts,
    fullCombo: score.fullCombo,
    maxCombo: score.maxCombo,
    modifiers: score.modifiers,
    timestamp: score.timestamp.toISOString(),
  };
}

/**
 * Trims a ranked batch to the fields the model needs, dropping the pp bookkeeping.
 */
export function trimRankedBatch(rankedBatch: RankedBatch) {
  return {
    rankedBatchId: rankedBatch.id,
    name: rankedBatch.name,
    startedAt: rankedBatch.startedAt.toISOString(),
    endedAt: rankedBatch.endedAt.toISOString(),
    leaderboardCount: rankedBatch.leaderboardCount,
    newLeaderboardCount: rankedBatch.newLeaderboardCount,
    playerCount: rankedBatch.playerCount,
    ppPending: rankedBatch.ppPending,
  };
}

/**
 * Trims a realm to the fields the model needs to pick a valid realm.
 */
export function trimRealm(realm: ScoreSaberV2RealmToken) {
  return {
    realmId: realm.id,
    name: realm.name,
    startDate: realm.startDate,
    endDate: realm.endDate,
    isAcceptingScores: realm.isAcceptingScores,
    hasPP: realm.hasPP,
  };
}

/**
 * Trims a suggested map to the fields the model needs to describe it and its expected gain.
 */
export function trimSuggestedMap(map: SuggestedMap) {
  return {
    leaderboardId: map.leaderboardId,
    songName: map.songName,
    songSubName: map.songSubName,
    songAuthorName: map.songAuthorName,
    levelAuthorName: map.levelAuthorName,
    songHash: map.songHash,
    difficulty: map.difficulty,
    characteristic: map.characteristic,
    stars: map.stars,
    seconds: map.seconds,
    nps: map.nps,
    predictedAccuracy: map.predictedAccuracy,
    predictedPp: map.predictedPp,
    weightedGain: map.weightedGain,
    currentAccuracy: map.currentAccuracy,
    currentPp: map.currentPp,
    familiarity: map.familiarity,
  };
}
