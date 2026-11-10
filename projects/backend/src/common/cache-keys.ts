import { DetailType } from "@ssr/common/detail-type";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";

export function normalizeSongHash(hash: string): string {
  return hash.trim().toLowerCase();
}

// Leaderboard
export const rankingQueueLeaderboardsCacheKey = "leaderboard:ranking-queue-maps";

// ScoreSaber
/**
 * The suffix that scopes a cache key to a realm. The default realm has none so its keys stay
 * identical to the pre-realm ones.
 */
function realmKeySuffix(realmId: number): string {
  return realmId === DEFAULT_REALM_ID ? "" : `:realm:${realmId}`;
}

export function playerCacheKey(id: string, type: DetailType, realmId: number = DEFAULT_REALM_ID): string {
  return `scoresaber:player:${id}:${type}${realmKeySuffix(realmId)}`;
}

export function playerExistsCacheKey(id: string): string {
  return `scoresaber:player:${id}:exists`;
}

export function cachedPlayerTokenCacheKey(id: string): string {
  return `scoresaber:cached-player:${id}`;
}

export function scoreSaberApiResponseCacheKey(cacheHash: string): string {
  return `scoresaber:api-cache:${cacheHash}`;
}

export function miniRankingCacheKey(
  playerId: string,
  type: "global" | "country" | "medals",
  page: number,
  country?: string,
  realmId: number = DEFAULT_REALM_ID
): string {
  if (type === "medals") {
    return `scoresaber:mini-ranking:${playerId}:medals:${page}`;
  }
  return `scoresaber:mini-ranking:${playerId}:${type}${type === "country" ? `:${country ?? ""}` : ""}:${page}${realmKeySuffix(realmId)}`;
}

// BeatSaver
export function beatSaverMapCacheKey(
  hash: string,
  difficulty: MapDifficulty,
  characteristic: MapCharacteristic
): string {
  return `beatsaver:${normalizeSongHash(hash)}-${difficulty.toLowerCase()}-${characteristic.toLowerCase()}`;
}

// BeatLeader
export function beatLeaderScoreByIdCacheKey(scoreId: number): string {
  return `beatleader-score:${scoreId}`;
}

export function beatLeaderScoreBySongCacheKey(
  playerId: string,
  songHash: string,
  songDifficulty: string,
  songScore: number
): string {
  return `beatleader-score:${playerId}-${normalizeSongHash(songHash)}-${songDifficulty}-${songScore}`;
}

// Score history
export function scoreHistoryGraphCacheKey(playerId: string, leaderboardId: number): string {
  return `score-history-graph:${playerId}-${leaderboardId}`;
}
