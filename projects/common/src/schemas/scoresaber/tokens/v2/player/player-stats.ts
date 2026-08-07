import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberV2PlayerDeviceTokenSchema } from "./player-device";

export const ScoreSaberV2PlayerStatsTokenSchema = Type.Object({
  realmId: Type.Number(),
  realmName: Type.String(),
  rank: Type.Number(),
  countryRank: Type.Number(),
  rankChange: Type.Union([Type.Number(), Type.Null()]),
  totalPP: Type.Number(),
  plusOnePP: Type.Union([Type.Number(), Type.Null()]),
  totalScore: Type.String(),
  totalRankedScore: Type.String(),
  totalPlayedLeaderboards: Type.Number(),
  totalPlayedRankedLeaderboards: Type.Number(),
  totalSubmittedPlays: Type.Number(),
  totalReplayViews: Type.Number(),
  averageAccuracy: Type.Number(),
  weightedAverageAccuracy: Type.Number(),
  completionAccuracy: Type.Number(),
  device: Type.Union([ScoreSaberV2PlayerDeviceTokenSchema, Type.Null()]),
});

export type ScoreSaberV2PlayerStatsToken = StaticDecode<typeof ScoreSaberV2PlayerStatsTokenSchema>;
