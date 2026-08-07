import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberLeaderboardQuerySortSchema = Type.Union([Type.Literal("asc"), Type.Literal("desc")]);

export const ScoreSaberLeaderboardQueryCategorySchema = Type.Union([
  Type.Literal("date_ranked"),
  Type.Literal("date_created"),
  Type.Literal("star_difficulty"),
  Type.Literal("plays"),
  Type.Literal("daily_plays"),
  Type.Literal("trending"),
]);

export const ScoreSaberLeaderboardQueryFiltersSchema = Type.Object({
  ranked: Type.Optional(Type.Boolean()),
  qualified: Type.Optional(Type.Boolean()),
  category: Type.Optional(
    Type.Union(
      [
        Type.Literal("date_ranked"),
        Type.Literal("date_created"),
        Type.Literal("star_difficulty"),
        Type.Literal("plays"),
        Type.Literal("daily_plays"),
        Type.Literal("trending"),
      ],
      { default: "trending" }
    )
  ),
  minStars: Type.Optional(Type.Number()),
  maxStars: Type.Optional(Type.Number()),
  sort: Type.Optional(Type.Union([Type.Literal("asc"), Type.Literal("desc")], { default: "desc" })),
  query: Type.Optional(Type.String()),
});

export type ScoreSaberLeaderboardQuerySort = StaticDecode<typeof ScoreSaberLeaderboardQuerySortSchema>;
export type ScoreSaberLeaderboardQueryCategory = StaticDecode<
  typeof ScoreSaberLeaderboardQueryCategorySchema
>;
export type ScoreSaberLeaderboardQueryFilters = StaticDecode<typeof ScoreSaberLeaderboardQueryFiltersSchema>;
