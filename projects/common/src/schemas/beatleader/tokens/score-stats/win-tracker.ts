import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreStatsHeadPositionSchema } from "./head-position";

export const ScoreStatsWinTrackerSchema = Type.Object({
  won: Type.Boolean(),
  endTime: Type.Number(),
  failTime: Type.Optional(Type.Number()),
  nbOfPause: Type.Number(),
  totalPauseDuration: Type.Number(),
  jumpDistance: Type.Number(),
  averageHeight: Type.Number(),
  averageHeadPosition: ScoreStatsHeadPositionSchema,
  totalScore: Type.Number(),
  maxScore: Type.Number(),
});

export type ScoreStatsWinTrackerToken = StaticDecode<typeof ScoreStatsWinTrackerSchema>;
