import { z } from "zod";
import { PaginationMetadataSchema } from "../../pagination";
import { McpMedalPlayerSummarySchema, McpPlayerSummarySchema } from "./player-summary";
import { McpScoreSummarySchema } from "./score-summary";

export const McpScoresPageSchema = z.object({
  items: z.array(McpScoreSummarySchema),
  metadata: PaginationMetadataSchema,
});

export const McpRankingPageSchema = z.object({
  items: z.array(McpPlayerSummarySchema),
  metadata: PaginationMetadataSchema,
});

export const McpMedalRankingPageSchema = z.object({
  items: z.array(McpMedalPlayerSummarySchema),
  metadata: PaginationMetadataSchema,
});

export type McpScoresPage = z.infer<typeof McpScoresPageSchema>;
export type McpRankingPage = z.infer<typeof McpRankingPageSchema>;
export type McpMedalRankingPage = z.infer<typeof McpMedalRankingPageSchema>;
