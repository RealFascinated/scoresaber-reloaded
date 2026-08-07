import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberMedalScoreSortFieldSchema = Type.Union([
  Type.Literal("medals"),
  Type.Literal("misses"),
  Type.Literal("acc"),
  Type.Literal("score"),
  Type.Literal("maxcombo"),
  Type.Literal("date"),
]);
export type ScoreSaberMedalScoreSortField = StaticDecode<typeof ScoreSaberMedalScoreSortFieldSchema>;
