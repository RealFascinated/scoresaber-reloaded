import { z } from "zod";

export const ScoreSaberPeakRankSchema = z.object({
  rank: z.number(),
  timestamp: z.coerce.date(),
});

export type ScoreSaberPeakRank = z.infer<typeof ScoreSaberPeakRankSchema>;
