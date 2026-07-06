import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLeaderboardTools } from "./tools/leaderboard.tools";
import { registerPlayerTools } from "./tools/player.tools";
import { registerRankingTools } from "./tools/ranking.tools";
import { registerScoreTools } from "./tools/scores.tools";

export async function registerMcpTools(server: McpServer) {
  registerPlayerTools(server);
  registerLeaderboardTools(server);
  registerRankingTools(server);
  registerScoreTools(server);
}
