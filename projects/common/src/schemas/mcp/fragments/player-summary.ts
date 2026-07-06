import { z } from "zod";

export const McpPlayerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  rank: z.number(),
  country: z.string(),
  pp: z.number(),
});

export type McpPlayerSummary = z.infer<typeof McpPlayerSummarySchema>;

export const McpMedalPlayerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  medals: z.number(),
  medalsRank: z.number(),
  medalsCountryRank: z.number(),
});

export type McpMedalPlayerSummary = z.infer<typeof McpMedalPlayerSummarySchema>;

export const McpSearchPlayersResponseSchema = z.object({
  players: z.array(McpPlayerSummarySchema),
});

export type McpSearchPlayersResponse = z.infer<typeof McpSearchPlayersResponseSchema>;
