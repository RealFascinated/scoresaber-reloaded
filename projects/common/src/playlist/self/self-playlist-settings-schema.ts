import { z } from "zod";

export const SelfPlaylistSortFieldSchema = z.enum(["pp", "date", "acc", "score"]);
export const SelfPlaylistSortDirectionSchema = z.enum(["asc", "desc"]);

export const selfPlaylistSettingsSchema = z.object({
  sort: SelfPlaylistSortFieldSchema,
  sortDirection: SelfPlaylistSortDirectionSchema,
  rankedStatus: z.enum(["all", "ranked", "unranked"]),
  starRange: z.object({
    min: z.number().min(0).max(20),
    max: z.number().min(0).max(20),
  }),
  accuracyRange: z.object({
    min: z.number().min(0).max(100),
    max: z.number().min(0).max(100),
  }),
});

export type SelfPlaylistSettings = z.infer<typeof selfPlaylistSettingsSchema>;
