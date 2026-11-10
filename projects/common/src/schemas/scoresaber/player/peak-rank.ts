import { Type, type StaticDecode } from "typebox";
import { DateSchema } from "../../date";

export const ScoreSaberPeakRankSchema = Type.Object({
  rank: Type.Number(),
  timestamp: DateSchema,
});

export type ScoreSaberPeakRank = StaticDecode<typeof ScoreSaberPeakRankSchema>;
