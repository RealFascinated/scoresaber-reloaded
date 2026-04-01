import { z } from "zod";
import { ScoreSaberScoreSortFieldSchema } from "../schemas/score/query/sort/scoresaber-scores-sort";
import { SortDirectionSchema } from "../schemas/score/query/sort/sort-direction";

export const snipeSettingsSchema = z.object({
  sort: ScoreSaberScoreSortFieldSchema,
  sortDirection: SortDirectionSchema,
  rankedStatus: z.enum(["all", "ranked", "unranked"]),
  requireBothScores: z.boolean(),
  starRange: z.object({
    min: z.number().min(0).max(20),
    max: z.number().min(0).max(20),
  }),
  accuracyRange: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  }),
});

export type SnipeSettings = z.infer<typeof snipeSettingsSchema>;
