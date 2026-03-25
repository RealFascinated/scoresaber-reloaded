import { z } from "zod";

export const BeatLeaderModifierRatingSchema = z
  .object({
    id: z.number(),
    fsPredictedAcc: z.number(),
    fsPassRating: z.number(),
    fsAccRating: z.number(),
    fsTechRating: z.number(),
    fsStars: z.number(),
    ssPredictedAcc: z.number(),
    ssPassRating: z.number(),
    ssAccRating: z.number(),
    ssTechRating: z.number(),
    ssStars: z.number(),
    sfPredictedAcc: z.number(),
    sfPassRating: z.number(),
    sfAccRating: z.number(),
    sfTechRating: z.number(),
    sfStars: z.number(),
  })
  .passthrough();

export type BeatLeaderModifierRatingToken = z.infer<typeof BeatLeaderModifierRatingSchema>;
