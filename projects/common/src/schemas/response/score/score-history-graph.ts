import { z } from "zod";

const ScoreHistoryGraphSchema = z.object({
  timestamp: z.date(),
  accuracy: z.number(),
}).array();
export type ScoreHistoryGraph = z.infer<typeof ScoreHistoryGraphSchema>;