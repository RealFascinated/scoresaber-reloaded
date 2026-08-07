import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreStatsHeadPositionSchema = Type.Object({
  x: Type.Number(),
  y: Type.Number(),
  z: Type.Number(),
});

export type ScoreStatsHeadPositionToken = StaticDecode<typeof ScoreStatsHeadPositionSchema>;
