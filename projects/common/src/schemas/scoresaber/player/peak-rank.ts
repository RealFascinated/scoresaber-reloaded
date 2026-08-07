import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberPeakRankSchema = Type.Object({
  rank: Type.Number(),
  timestamp: Type.Date(),
});

export type ScoreSaberPeakRank = StaticDecode<typeof ScoreSaberPeakRankSchema>;
