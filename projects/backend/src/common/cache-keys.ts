import { DetailType } from "@ssr/common/detail-type";
import { MapCharacteristic } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficulty } from "@ssr/common/schemas/map/map-difficulty";

export function normalizeSongHash(hash: string): string {
  return hash.trim().toLowerCase();
}

// Leaderboard
export const rankedLeaderboardsCacheKey = "leaderboard:ranked-leaderboards";
export const qualifiedLeaderboardsCacheKey = "leaderboard:qualified-leaderboards";
export const rankingQueueLeaderboardsCacheKey = "leaderboard:ranking-queue-maps";

export function leaderboardByIdCacheKey(id: number): string {
  return `leaderboard:id:${id}`;
}

export function leaderboardByHashCacheKey(
  hash: string,
  difficulty: MapDifficulty,
  characteristic: MapCharacteristic
): string {
  return `leaderboard:hash:${normalizeSongHash(hash)}:${difficulty}:${characteristic}`;
}

export function leaderboardStarChangeCacheKey(id: number): string {
  return `leaderboard:star-change:${id}`;
}

// ScoreSaber
export function playerCacheKey(id: string, type: DetailType): string {
  return `scoresaber:player:${id}:${type}`;
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
  country?: string
): string {
  if (type === "medals") {
    return `scoresaber:mini-ranking:${playerId}:medals:${page}`;
  }
  return `scoresaber:mini-ranking:${playerId}:${type}${type === "country" ? `:${country ?? ""}` : ""}:${page}`;
}

// BeatSaver
export function beatSaverMapCacheKey(hash: string): string {
  return `beatsaver:${normalizeSongHash(hash)}`;
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
