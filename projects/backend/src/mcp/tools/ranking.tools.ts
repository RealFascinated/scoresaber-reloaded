import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlayerMedalsService } from "../../service/medals/player-medals.service";
import { PlayerSearchService } from "../../service/player/player-search.service";
import { mcpMedalRankingPageResult, mcpRankingPageResult } from "../mappers/ranking.mappers";

export function registerRankingTools(server: McpServer) {
  server.registerTool(
    "get_global_ranking",
    {
      description: "Get the global or country PP player ranking page",
      inputSchema: {
        page: z.coerce.number().int().min(1).default(1).describe("Page number"),
        country: z.string().optional().describe("Optional country filter (ISO code)"),
        search: z.string().optional().describe("Optional player name search"),
        includeInactives: z.coerce.boolean().default(false).optional().describe("Include inactive players"),
      },
    },
    async ({ page, country, search, includeInactives }) => {
      const response = await PlayerSearchService.getPlayerRanking(page, {
        country,
        search,
        includeInactives,
      });
      return mcpRankingPageResult(response);
    }
  );

  server.registerTool(
    "get_medal_ranking",
    {
      description: "Get the global or country medal ranking page",
      inputSchema: {
        page: z.coerce.number().int().min(1).default(1).describe("Page number"),
        country: z.string().optional().describe("Optional country filter (ISO code)"),
      },
    },
    async ({ page, country }) => {
      const response = await PlayerMedalsService.getPlayerMedalRanking(page, country);
      return mcpMedalRankingPageResult(response);
    }
  );
}
