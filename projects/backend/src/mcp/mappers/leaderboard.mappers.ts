import type { McpLeaderboardDetail } from "@ssr/common/schemas/mcp/leaderboard/get-leaderboard";
import type { McpLeaderboardScoresPage } from "@ssr/common/schemas/mcp/leaderboard/get-leaderboard-scores";
import type { McpLeaderboardSearchPage } from "@ssr/common/schemas/mcp/leaderboard/search-leaderboards";
import type { LeaderboardResponse } from "@ssr/common/schemas/response/leaderboard/leaderboard";
import type LeaderboardScoresResponse from "@ssr/common/schemas/response/leaderboard/leaderboard-scores";
import type { LeaderboardsPageResponse } from "@ssr/common/schemas/response/leaderboard/leaderboards-page";
import { mcpJsonContent, toMcpSongRef } from "./shared.mappers";

export function toMcpLeaderboardSearchPage(response: LeaderboardsPageResponse): McpLeaderboardSearchPage {
  return {
    items: response.items.map(leaderboard => ({
      leaderboardId: leaderboard.id,
      songName: leaderboard.songName,
      songAuthorName: leaderboard.songAuthorName,
      stars: leaderboard.stars,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
      ranked: leaderboard.ranked,
      plays: leaderboard.plays,
    })),
    metadata: response.metadata,
  };
}

export function toMcpLeaderboardDetail(response: LeaderboardResponse): McpLeaderboardDetail {
  const song = toMcpSongRef(response.leaderboard);
  return {
    leaderboardId: response.leaderboard.id,
    song,
    ranked: response.leaderboard.ranked,
    qualified: response.leaderboard.qualified,
    plays: response.leaderboard.plays,
    beatsaverName: response.beatsaver?.name,
    beatsaverBsr: response.beatsaver?.bsr,
    levelAuthor: response.beatsaver?.metadata.levelAuthorName ?? response.leaderboard.levelAuthorName,
  };
}

export function toMcpLeaderboardScoresPage(response: LeaderboardScoresResponse): McpLeaderboardScoresPage {
  return {
    items: response.scores.map(score => ({
      rank: score.rank,
      playerId: score.playerId,
      playerName: score.playerInfo?.name ?? score.playerId,
      score: score.score,
      accuracy: score.accuracy,
      pp: score.pp,
      misses: score.misses,
      modifiers: score.modifiers,
    })),
    metadata: response.metadata,
    songName: response.leaderboard.songName,
    leaderboardId: response.leaderboard.id,
  };
}

export function mcpLeaderboardSearchPageResult(response: LeaderboardsPageResponse) {
  return mcpJsonContent(toMcpLeaderboardSearchPage(response));
}

export function mcpLeaderboardDetailResult(response: LeaderboardResponse) {
  return mcpJsonContent(toMcpLeaderboardDetail(response));
}

export function mcpLeaderboardScoresPageResult(response: LeaderboardScoresResponse) {
  return mcpJsonContent(toMcpLeaderboardScoresPage(response));
}
