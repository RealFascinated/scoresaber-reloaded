import { z } from "zod";

export const snipeSettingsSchema = z.object({
  sort: z.enum(["pp", "misses", "acc", "score", "maxcombo", "date"]),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  limit: z.number().min(25).max(500),
  rankedStatus: z.enum(["all", "ranked", "unranked"]).optional(),
  starRange: z
    .object({
      min: z.number().min(0).max(20),
      max: z.number().min(0).max(20),
    })
    .optional(),
});

export type SnipeSettings = z.infer<typeof snipeSettingsSchema>;
