import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2RealmTokenSchema = Type.Object({
  id: Type.Number(),
  name: Type.String(),
  startDate: Type.String(),
  endDate: Type.Union([Type.String(), Type.Null()]),
  isAcceptingScores: Type.Boolean(),
  hasPP: Type.Boolean(),
  hasHistory: Type.Boolean(),
  decayFactor: Type.Number(),
});

export type ScoreSaberV2RealmToken = StaticDecode<typeof ScoreSaberV2RealmTokenSchema>;
