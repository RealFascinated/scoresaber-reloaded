import { Type, type StaticDecode } from "@sinclair/typebox";

export const MapDifficultyParitySummaryTokenSchema = Type.Object({
  errors: Type.Number(),
  warns: Type.Number(),
  resets: Type.Number(),
});

export type MapDifficultyParitySummaryToken = StaticDecode<typeof MapDifficultyParitySummaryTokenSchema>;
