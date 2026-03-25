import { z } from "zod";
import { BeatLeaderModifierRatingSchema } from "../modifier/modifier-rating";
import { BeatLeaderModifierSchema } from "../modifier/modifiers";

const nullableNumber = z.union([z.number(), z.null()]);

export const BeatLeaderDifficultySchema = z
  .object({
    id: z.number(),
    value: z.number(),
    mode: z.number(),
    difficultyName: z.string(),
    modeName: z.string(),
    status: z.number(),
    modifierValues: BeatLeaderModifierSchema,
    modifiersRating: z.union([BeatLeaderModifierRatingSchema, z.null()]),
    nominatedTime: z.number(),
    qualifiedTime: z.number(),
    rankedTime: z.number(),
    stars: nullableNumber,
    predictedAcc: nullableNumber,
    passRating: nullableNumber,
    accRating: nullableNumber,
    techRating: nullableNumber,
    multiRating: nullableNumber,
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
  .loose();

export type BeatLeaderDifficultyToken = z.infer<typeof BeatLeaderDifficultySchema>;
