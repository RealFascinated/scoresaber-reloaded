import { z } from "zod";

export const snipeSettingsSchema = z.object({
  name: z.string().min(1).max(32).optional(),
  sort: z.enum(["pp", "misses", "acc", "score", "maxcombo", "date"]),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  limit: z.number().min(25).max(250),
  rankedStatus: z.enum(["all", "ranked", "unranked"]).optional(),
  starRange: z
    .object({
      min: z.number().min(0).max(20),
      max: z.number().min(0).max(20),
    })
    .optional(),
  accuracyRange: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  }),
});

export type SnipeSettings = z.infer<typeof snipeSettingsSchema>;
