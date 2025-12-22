import { z } from "zod";
import { SortDirectionSchema, SortFieldSchema } from "../types/score-query";

export const snipeSettingsSchema = z.object({
  sort: SortFieldSchema,
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
