import { z } from "zod";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";
import { PaginationMetadataSchema } from "../../pagination";

export const McpLeaderboardSearchItemSchema = z.object({
  leaderboardId: z.number(),
  songName: z.string(),
  songAuthorName: z.string(),
  stars: z.number(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
  ranked: z.boolean(),
  plays: z.number(),
});

export const McpLeaderboardSearchPageSchema = z.object({
  items: z.array(McpLeaderboardSearchItemSchema),
  metadata: PaginationMetadataSchema,
});

export type McpLeaderboardSearchItem = z.infer<typeof McpLeaderboardSearchItemSchema>;
export type McpLeaderboardSearchPage = z.infer<typeof McpLeaderboardSearchPageSchema>;
