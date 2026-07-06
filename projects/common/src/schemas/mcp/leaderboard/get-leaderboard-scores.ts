import { z } from "zod";
import { ModifiersSchema } from "../../../score/modifier";
import { PaginationMetadataSchema } from "../../pagination";

export const McpLeaderboardScoreItemSchema = z.object({
  rank: z.number(),
  playerId: z.string(),
  playerName: z.string(),
  score: z.number(),
  accuracy: z.number(),
  pp: z.number(),
  misses: z.number(),
  modifiers: ModifiersSchema,
});

export const McpLeaderboardScoresPageSchema = z.object({
  items: z.array(McpLeaderboardScoreItemSchema),
  metadata: PaginationMetadataSchema,
  songName: z.string(),
  leaderboardId: z.number(),
});

export type McpLeaderboardScoreItem = z.infer<typeof McpLeaderboardScoreItemSchema>;
export type McpLeaderboardScoresPage = z.infer<typeof McpLeaderboardScoresPageSchema>;
