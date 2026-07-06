import type { McpMedalRankingPage, McpRankingPage } from "@ssr/common/schemas/mcp/fragments/page";
import type { PlayerRankingsResponse } from "@ssr/common/schemas/response/player/player-rankings";
import type { PlayerMedalRankingsResponse } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { mcpJsonContent, toMcpPlayerSummary } from "./shared.mappers";

export function toMcpRankingPage(response: PlayerRankingsResponse): McpRankingPage {
  return {
    items: response.items.map(player => toMcpPlayerSummary(player)),
    metadata: response.metadata,
  };
}

export function toMcpMedalRankingPage(response: PlayerMedalRankingsResponse): McpMedalRankingPage {
  return {
    items: response.items.map(player => ({
      id: player.id,
      name: player.name,
      country: player.country ?? "",
      medals: player.medals,
      medalsRank: player.medalsRank,
      medalsCountryRank: player.medalsCountryRank,
    })),
    metadata: response.metadata,
  };
}

export function mcpRankingPageResult(response: PlayerRankingsResponse) {
  return mcpJsonContent(toMcpRankingPage(response));
}

export function mcpMedalRankingPageResult(response: PlayerMedalRankingsResponse) {
  return mcpJsonContent(toMcpMedalRankingPage(response));
}
