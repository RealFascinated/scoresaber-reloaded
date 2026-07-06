import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import BeatLeaderService from "../../service/beatleader/beatleader.service";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { TopScoresService } from "../../service/score/top-scores.service";
import {
  mcpBeatLeaderScoreStatsResult,
  mcpScoreResult,
  mcpTopScoresPageResult,
} from "../mappers/score.mappers";

export function registerScoreTools(server: McpServer) {
  server.registerTool(
    "get_score",
    {
      description: "Get details for a single ScoreSaber score",
      inputSchema: {
        scoreId: z.coerce.number().describe("ScoreSaber score ID"),
      },
    },
    async ({ scoreId }) => {
      const score = await PlayerScoresService.getScore(scoreId);
      return mcpScoreResult(score);
    }
  );

  server.registerTool(
    "get_top_scores",
    {
      description: "Get recent top plays from SSR",
      inputSchema: {
        page: z.coerce.number().int().min(1).default(1).describe("Page number"),
        limit: z.coerce.number().int().min(1).max(50).default(25).describe("Scores per page"),
      },
    },
    async ({ page, limit }) => {
      const response = await TopScoresService.getTopScores(page, limit);
      return mcpTopScoresPageResult(response);
    }
  );

  server.registerTool(
    "get_beatleader_score_stats",
    {
      description:
        "Get BeatLeader score analysis for a score: per-hand misses, accuracy, and comparison to previous attempt",
      inputSchema: {
        scoreId: z.coerce.number().describe("ScoreSaber / BeatLeader score ID"),
      },
    },
    async ({ scoreId }) => {
      const response = await BeatLeaderService.getScoresFullScoreStats(scoreId);
      return mcpBeatLeaderScoreStatsResult(response);
    }
  );
}
