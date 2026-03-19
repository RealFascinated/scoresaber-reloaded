import { z } from "zod";

export const ScoreStatsGraphTrackerSchema = z.object({
  graph: z.array(z.number()),
});

export type ScoreStatsGraphTrackerToken = z.infer<typeof ScoreStatsGraphTrackerSchema>;
