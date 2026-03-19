import { z } from "zod";
import { BeatLeaderModifierRatingSchema } from "../modifier/modifier-rating";
import { BeatLeaderModifierSchema } from "../modifier/modifiers";

export const BeatLeaderDifficultySchema = z
  .object({
    id: z.number(),
    value: z.number(),
    mode: z.number(),
    difficultyName: z.string(),
    modeName: z.string(),
    status: z.number(),
    modifierValues: BeatLeaderModifierSchema,
    modifiersRating: BeatLeaderModifierRatingSchema,
    nominatedTime: z.number(),
    qualifiedTime: z.number(),
    rankedTime: z.number(),
    stars: z.number(),
    predictedAcc: z.number(),
    passRating: z.number(),
    accRating: z.number(),
    techRating: z.number(),
    type: z.number(),
    njs: z.number(),
    nps: z.number(),
    notes: z.number(),
    bombs: z.number(),
    walls: z.number(),
    maxScore: z.number(),
    duration: z.number(),
    requirements: z.number(),
  })
  .passthrough();

export type BeatLeaderDifficultyToken = z.infer<typeof BeatLeaderDifficultySchema>;
