import { z } from "zod";

export const accSaberScorePayloadSchema = z.object({
  ap: z.number(),
  rank: z.number(),
  unmodifiedScore: z.number(),
  score: z.number(),
  mods: z.literal(null),
  timeSet: z.coerce.date(),
  acc: z.number(),
  percentage: z.number(),
  weightedAp: z.number(),
});
