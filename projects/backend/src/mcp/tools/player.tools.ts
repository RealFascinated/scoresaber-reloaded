import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlayerScoresQuerySchema } from "@ssr/common/schemas/score/query/player-scores-query";
import { ScoreSaberScoreSortFieldSchema } from "@ssr/common/schemas/score/query/sort/scoresaber-scores-sort";
import { SortDirectionSchema } from "@ssr/common/schemas/score/query/sort/sort-direction";
import { z } from "zod";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { PlayerSearchService } from "../../service/player/player-search.service";
import ScoreSaberPlayerService from "../../service/player/scoresaber-player.service";
import {
  mcpPlayerProfileResult,
  mcpPlayerScoresPageResult,
  mcpSearchPlayersResult,
} from "../mappers/player.mappers";

export function registerPlayerTools(server: McpServer) {
  server.registerTool(
    "search_players",
    {
      description: "Search ScoreSaber players by name",
      inputSchema: {
        query: z.string().max(64).optional().describe("Player name search query"),
      },
    },
    async ({ query }) => {
      const players = await PlayerSearchService.searchPlayers(query);
      return mcpSearchPlayersResult(players);
    }
  );

  server.registerTool(
    "get_player",
    {
      description: "Get a ScoreSaber player profile with rank, PP, medals, and streaks",
      inputSchema: {
        playerId: z.string().describe("ScoreSaber player ID"),
      },
    },
    async ({ playerId }) => {
      const player = await ScoreSaberPlayerService.getPlayer(playerId);
      return mcpPlayerProfileResult(player);
    }
  );

  server.registerTool(
    "get_player_scores",
    {
      description: "Get paginated ranked scores for a player from SSR",
      inputSchema: {
        playerId: z.string().describe("ScoreSaber player ID"),
        page: z.coerce.number().int().min(1).default(1).describe("Page number"),
        field: ScoreSaberScoreSortFieldSchema.default("pp").describe("Sort field"),
        direction: SortDirectionSchema.default("desc").describe("Sort direction"),
        search: PlayerScoresQuerySchema.shape.search,
      },
    },
    async ({ playerId, page, field, direction, search }) => {
      const response = await PlayerScoresService.getScoreSaberPlayerScores(playerId, page, field, direction, {
        search,
      });
      return mcpPlayerScoresPageResult(response);
    }
  );
}
