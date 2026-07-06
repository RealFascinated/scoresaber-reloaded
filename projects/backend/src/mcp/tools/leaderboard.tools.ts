import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { MapCharacteristicSchema } from "@ssr/common/schemas/map/map-characteristic";
import { MapDifficultySchema } from "@ssr/common/schemas/map/map-difficulty";
import { ScoreSaberLeaderboardQueryFiltersSchema } from "@ssr/common/schemas/scoresaber/leaderboard/query-filters";
import { z } from "zod";
import BeatSaverService from "../../service/external/beatsaver.service";
import { ScoreSaberLeaderboardScoresService } from "../../service/leaderboard/scoresaber-leaderboard-scores.service";
import { ScoreSaberLeaderboardsService } from "../../service/leaderboard/scoresaber-leaderboards.service";
import {
  mcpLeaderboardDetailResult,
  mcpLeaderboardScoresPageResult,
  mcpLeaderboardSearchPageResult,
} from "../mappers/leaderboard.mappers";

export function registerLeaderboardTools(server: McpServer) {
  server.registerTool(
    "search_leaderboards",
    {
      description: "Search ScoreSaber leaderboards by song name, stars, and ranking status",
      inputSchema: {
        page: z.coerce.number().int().min(1).default(1).describe("Page number"),
        ranked: ScoreSaberLeaderboardQueryFiltersSchema.shape.ranked,
        qualified: ScoreSaberLeaderboardQueryFiltersSchema.shape.qualified,
        category: ScoreSaberLeaderboardQueryFiltersSchema.shape.category,
        minStars: ScoreSaberLeaderboardQueryFiltersSchema.shape.minStars,
        maxStars: ScoreSaberLeaderboardQueryFiltersSchema.shape.maxStars,
        sort: ScoreSaberLeaderboardQueryFiltersSchema.shape.sort,
        query: ScoreSaberLeaderboardQueryFiltersSchema.shape.query,
      },
    },
    async ({ page, ...filters }) => {
      const response = await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(page, filters);
      return mcpLeaderboardSearchPageResult(response);
    }
  );

  server.registerTool(
    "get_leaderboard",
    {
      description:
        "Get leaderboard and map details by leaderboard ID, or by song hash with difficulty and characteristic",
      inputSchema: {
        leaderboardId: z.coerce.number().optional().describe("ScoreSaber leaderboard ID"),
        hash: z.string().optional().describe("Song hash (use with difficulty and characteristic)"),
        difficulty: MapDifficultySchema.optional().describe("Map difficulty when using hash"),
        characteristic: MapCharacteristicSchema.optional().describe("Map characteristic when using hash"),
      },
    },
    async ({ leaderboardId, hash, difficulty, characteristic }) => {
      if (leaderboardId !== undefined) {
        const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(leaderboardId);
        const beatsaver = await BeatSaverService.getMap(
          leaderboard.songHash,
          leaderboard.difficulty.difficulty,
          leaderboard.difficulty.characteristic
        );
        return mcpLeaderboardDetailResult({ leaderboard, beatsaver });
      }

      if (hash && difficulty && characteristic) {
        const [leaderboard, beatsaver] = await Promise.all([
          ScoreSaberLeaderboardsService.getLeaderboardByHash(hash, difficulty, characteristic),
          BeatSaverService.getMap(hash, difficulty, characteristic),
        ]);
        return mcpLeaderboardDetailResult({ leaderboard, beatsaver });
      }

      throw new NotFoundError("Provide leaderboardId or hash with difficulty and characteristic");
    }
  );

  server.registerTool(
    "get_leaderboard_scores",
    {
      description: "Get scores on a leaderboard page",
      inputSchema: {
        leaderboardId: z.coerce.number().describe("ScoreSaber leaderboard ID"),
        page: z.coerce.number().int().min(1).default(1).describe("Page number"),
        country: z.string().optional().describe("Optional country filter (ISO code)"),
      },
    },
    async ({ leaderboardId, page, country }) => {
      const response = await ScoreSaberLeaderboardScoresService.getLeaderboardScores(
        leaderboardId,
        page,
        country
      );
      if (!response) {
        throw new NotFoundError(`Leaderboard scores for "${leaderboardId}" not found`);
      }
      return mcpLeaderboardScoresPageResult(response);
    }
  );
}
