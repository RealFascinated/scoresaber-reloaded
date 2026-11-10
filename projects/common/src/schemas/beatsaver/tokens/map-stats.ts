import { Type, type StaticDecode } from "typebox";

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
  plays: Type.Number(),

  downloads: Type.Number(),

  upvotes: Type.Number(),

  downvotes: Type.Number(),

  score: Type.Number(),

  reviews: Type.Number(),

  scoreOneDP: Type.Optional(Type.Number()),
  sentiment: Type.Optional(BeatSaverMapStatsSentimentSchema),
});

export type BeatSaverMapStatsToken = StaticDecode<typeof BeatSaverMapStatsTokenSchema>;
