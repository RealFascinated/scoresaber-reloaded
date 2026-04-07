import { z } from "zod";

export const ScoreSaberLeaderboardSearchSortSchema = z
  .enum([
    "asc",
    "desc"
  ]);

export const ScoreSaberLeaderboardSearchCategorySchema = z.enum([
  "date_ranked",
  "star_difficulty",
  "author",
  "plays",
  "trending",
]);

export const ScoreSaberLeaderboardSearchStarsSchema = z.object({
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
});

export const ScoreSaberLeaderboardSearchFiltersSchema = z.object({
  ranked: z.coerce.boolean().optional(),
  qualified: z.coerce.boolean().optional(),
  category: ScoreSaberLeaderboardSearchCategorySchema.default("trending").optional(),
  stars: ScoreSaberLeaderboardSearchStarsSchema.optional(),
  sort: ScoreSaberLeaderboardSearchSortSchema.default("desc").optional(),
  query: z.string().optional(),
});

export type ScoreSaberLeaderboardSearchSort = z.infer<typeof ScoreSaberLeaderboardSearchSortSchema>;
export type ScoreSaberLeaderboardSearchCategory = z.infer<typeof ScoreSaberLeaderboardSearchCategorySchema>;
export type ScoreSaberLeaderboardSearchFilters = z.infer<typeof ScoreSaberLeaderboardSearchFiltersSchema>;