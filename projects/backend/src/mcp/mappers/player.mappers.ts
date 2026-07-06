import type ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import type { McpSearchPlayersResponse } from "@ssr/common/schemas/mcp/fragments/player-summary";
import type { McpPlayerProfile } from "@ssr/common/schemas/mcp/player/get-player";
import type { PlayerScoresPageResponse } from "@ssr/common/schemas/response/score/player-scores";
import { mcpJsonContent, toMcpPlayerSummary, toMcpScoresPage } from "./shared.mappers";

export function toMcpSearchPlayersResponse(players: ScoreSaberPlayer[]): McpSearchPlayersResponse {
  return {
    players: players.map(toMcpPlayerSummary),
  };
}

export function toMcpPlayerProfile(player: ScoreSaberPlayer): McpPlayerProfile {
  return {
    id: player.id,
    name: player.name,
    rank: player.rank,
    countryRank: player.countryRank,
    country: player.country,
    pp: player.pp,
    medals: player.medals,
    medalsRank: player.medalsRank,
    medalsCountryRank: player.medalsCountryRank,
    hmd: player.hmd,
    joinedDate: player.joinedDate,
    currentStreak: player.currentStreak,
    longestStreak: player.longestStreak,
    inactive: player.inactive,
    banned: player.banned,
  };
}

export function mcpSearchPlayersResult(players: ScoreSaberPlayer[]) {
  return mcpJsonContent(toMcpSearchPlayersResponse(players));
}

export function mcpPlayerProfileResult(player: ScoreSaberPlayer) {
  return mcpJsonContent(toMcpPlayerProfile(player));
}

export function mcpPlayerScoresPageResult(response: PlayerScoresPageResponse) {
  return mcpJsonContent(toMcpScoresPage(response));
}
