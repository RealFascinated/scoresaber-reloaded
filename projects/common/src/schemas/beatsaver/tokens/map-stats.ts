import { Type, type StaticDecode } from "@sinclair/typebox";

/** BeatSaver API `MapStats.sentiment` (Swagger). */
export const BeatSaverMapStatsSentimentSchema = Type.Union([
  Type.Literal("PENDING"),
  Type.Literal("VERY_NEGATIVE"),
  Type.Literal("MOSTLY_NEGATIVE"),
  Type.Literal("MIXED"),
  Type.Literal("MOSTLY_POSITIVE"),
  Type.Literal("VERY_POSITIVE"),
]);

export type BeatSaverMapStatsSentiment = StaticDecode<typeof BeatSaverMapStatsSentimentSchema>;

/** Shapes `MapStats` (BeatSaver Swagger). */
export const BeatSaverMapStatsTokenSchema = Type.Object({
  /**
   * The amount of time the map has been played.
   */
  plays: Type.Number(),

  /**
   * The amount of times the map has been downloaded.
   */
  downloads: Type.Number(),

  /**
   * The amount of times the map has been upvoted.
   */
  upvotes: Type.Number(),

  /**
   * The amount of times the map has been downvoted.
   */
  downvotes: Type.Number(),

  /**
   * The score for the map
   */
  score: Type.Number(),

  /**
   * The amount of reviews for the map.
   */
  reviews: Type.Number(),

  scoreOneDP: Type.Optional(Type.Number()),
  sentiment: Type.Optional(BeatSaverMapStatsSentimentSchema),
});

export type BeatSaverMapStatsToken = StaticDecode<typeof BeatSaverMapStatsTokenSchema>;
