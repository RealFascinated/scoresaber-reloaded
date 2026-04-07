import { z } from "zod";

export const ScoreSaberLeaderboardQuerySortSchema = z.enum(["asc", "desc"]);

export const ScoreSaberLeaderboardQueryCategorySchema = z.enum([
  "date_ranked",
  "star_difficulty",
  "plays",
  "daily_plays",
  "trending",
]);

export const ScoreSaberLeaderboardQueryFiltersSchema = z.object({
  ranked: z.coerce.boolean().optional(),
  qualified: z.coerce.boolean().optional(),
  category: ScoreSaberLeaderboardQueryCategorySchema.default("trending").optional(),
  minStars: z.coerce.number().optional(),
  maxStars: z.coerce.number().optional(),
  sort: ScoreSaberLeaderboardQuerySortSchema.default("desc").optional(),
  query: z.string().optional(),
});

export type ScoreSaberLeaderboardQuerySort = z.infer<typeof ScoreSaberLeaderboardQuerySortSchema>;
export type ScoreSaberLeaderboardQueryCategory = z.infer<typeof ScoreSaberLeaderboardQueryCategorySchema>;
export type ScoreSaberLeaderboardQueryFilters = z.infer<typeof ScoreSaberLeaderboardQueryFiltersSchema>;
