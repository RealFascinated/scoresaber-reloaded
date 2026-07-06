import { z } from "zod";
import { ModifiersSchema } from "../../../score/modifier";
import { McpSongRefSchema } from "./song-ref";

export const McpScoreSummarySchema = z.object({
  scoreId: z.number(),
  playerId: z.string(),
  pp: z.number(),
  accuracy: z.number(),
  rank: z.number(),
  score: z.number(),
  misses: z.number(),
  modifiers: ModifiersSchema,
  timestamp: z.coerce.date(),
  song: McpSongRefSchema,
  playerName: z.string().optional(),
});

export type McpScoreSummary = z.infer<typeof McpScoreSummarySchema>;
