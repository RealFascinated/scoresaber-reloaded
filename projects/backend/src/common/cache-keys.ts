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

/**
 * Every player-derived cache key starts with this prefix, whatever the realm or detail type,
 * so one prefix removes all of them.
 */
export function playerCacheKeyPrefix(id: string): string {
  return `scoresaber:player:${id}:`;
}

/** Matches every player cache key, whatever the player, realm or detail type. */
export const playerCacheKeysPattern = "scoresaber:player:*";

export function playerCacheKey(id: string, type: DetailType, realmId: number): string {
  return `${playerCacheKeyPrefix(id)}${type}${realmKeySuffix(realmId)}`;
}

export function scoreSaberApiResponseCacheKey(cacheHash: string): string {
  return `scoresaber:api-cache:${cacheHash}`;
}

export function miniRankingCacheKeyPrefix(playerId: string): string {
  return `scoresaber:mini-ranking:${playerId}:`;
}

export function miniRankingCacheKey(
  playerId: string,
  type: "global" | "country",
  page: number,
  country: string | undefined,
  realmId: number
): string {
  const scope = type === "country" ? `country:${country ?? ""}` : type;
  return `${miniRankingCacheKeyPrefix(playerId)}${scope}:${page}${realmKeySuffix(realmId)}`;
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
