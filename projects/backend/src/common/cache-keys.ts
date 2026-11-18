import { DetailType } from "@ssr/common/detail-type";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";

export function normalizeSongHash(hash: string) {
  return hash.trim().toLowerCase();
}

export const rankingQueueLeaderboardsCacheKey = "leaderboard:ranking-queue-maps";

function realmKeySuffix(realmId: number) {
  return realmId === DEFAULT_REALM_ID ? "" : `:realm:${realmId}`;
}

/**
 * Every player-derived cache key starts with this prefix, whatever the realm or detail type,
 * so one prefix removes all of them.
 */
export function playerCacheKeyPrefix(id: string) {
  return `scoresaber:player:${id}:`;
}

/** Matches every player cache key, whatever the player, realm or detail type. */
export const playerCacheKeysPattern = "scoresaber:player:*";

export function playerCacheKey(id: string, type: DetailType, realmId: number) {
  return `${playerCacheKeyPrefix(id)}${type}${realmKeySuffix(realmId)}`;
}

export function scoreSaberApiResponseCacheKey(cacheHash: string) {
  return `scoresaber:api-cache:${cacheHash}`;
}

export function miniRankingCacheKey(
  type: "global" | "country",
  page: number,
  country: string | undefined,
  realmId: number
) {
  const scope = type === "country" ? `country:${country ?? ""}` : type;
  return `scoresaber:mini-ranking:${scope}:${page}${realmKeySuffix(realmId)}`;
}

export function miniRankingResponseCacheKeyPrefix(playerId: string) {
  return `scoresaber:mini-ranking-response:${playerId}:`;
}

export function miniRankingResponseCacheKey(playerId: string, realmId: number) {
  return `${miniRankingResponseCacheKeyPrefix(playerId)}${realmId}`;
}

export function leaderboardStarChangeCacheKey(leaderboardId: number, realmId: number) {
  return `scoresaber:leaderboard-star-change:${leaderboardId}${realmKeySuffix(realmId)}`;
}

export const RANKED_BATCH_MARKERS_CACHE_KEY = "scoresaber:ranked-batch-markers";

export function beatSaverMapCacheKey(
  hash: string,
  difficulty: MapDifficulty,
  characteristic: MapCharacteristic
) {
  return `beatsaver:${normalizeSongHash(hash)}-${difficulty.toLowerCase()}-${characteristic.toLowerCase()}`;
}

export function beatLeaderScoreByIdCacheKey(scoreId: number) {
  return `beatleader-score:${scoreId}`;
}

export function beatLeaderScoreBySongCacheKey(
  playerId: string,
  songHash: string,
  songDifficulty: string,
  songScore: number
) {
  return `beatleader-score:${playerId}-${normalizeSongHash(songHash)}-${songDifficulty}-${songScore}`;
}

export function scoreHistoryGraphCacheKey(playerId: string, leaderboardId: number) {
  return `score-history-graph:${playerId}-${leaderboardId}`;
}
