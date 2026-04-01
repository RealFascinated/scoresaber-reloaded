import { z } from "zod";

export const ScoreSaberPlayerScoreStatsSchema = z.object({
  aPlays: z.number(),
  sPlays: z.number(),
  spPlays: z.number(),
  ssPlays: z.number(),
  sspPlays: z.number(),
  godPlays: z.number(),
});

export type ScoreSaberPlayerScoreStats = z.infer<typeof ScoreSaberPlayerScoreStatsSchema>;
