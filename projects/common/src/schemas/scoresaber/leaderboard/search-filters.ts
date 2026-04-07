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
  min: z.number().optional(),
  max: z.number().optional(),
});

export const ScoreSaberLeaderboardSearchFiltersSchema = z.object({
  ranked: z.boolean().optional(),
  qualified: z.boolean().optional(),
  category: ScoreSaberLeaderboardSearchCategorySchema.optional(),
  stars: ScoreSaberLeaderboardSearchStarsSchema.optional(),
  sort: ScoreSaberLeaderboardSearchSortSchema.optional().default("desc"),
  query: z.string().optional(),
});

export type ScoreSaberLeaderboardSearchSort = z.infer<typeof ScoreSaberLeaderboardSearchSortSchema>;
export type ScoreSaberLeaderboardSearchCategory = z.infer<typeof ScoreSaberLeaderboardSearchCategorySchema>;
export type ScoreSaberLeaderboardSearchFilters = z.infer<typeof ScoreSaberLeaderboardSearchFiltersSchema>;