import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberScoreSortFieldSchema = Type.Union([
  Type.Literal("pp"),
  Type.Literal("misses"),
  Type.Literal("acc"),
  Type.Literal("score"),
  Type.Literal("maxcombo"),
  Type.Literal("date"),
]);
export type ScoreSaberScoreSortField = StaticDecode<typeof ScoreSaberScoreSortFieldSchema>;
