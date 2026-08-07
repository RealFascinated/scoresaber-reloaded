import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberV2LeaderboardStatusTokenSchema } from "./leaderboard-status";

export const ScoreSaberV2LeaderboardRealmTokenSchema = Type.Object({
  realmId: Type.Number(),
  realmName: Type.String(),
  leaderboardStatus: ScoreSaberV2LeaderboardStatusTokenSchema,
  positiveModifiers: Type.Boolean(),
  stars: Type.Number(),
  rankedAt: Type.Union([Type.String(), Type.Null()]),
  qualifiedAt: Type.Union([Type.String(), Type.Null()]),
  lovedAt: Type.Union([Type.String(), Type.Null()]),
});

export type ScoreSaberV2LeaderboardRealmToken = StaticDecode<typeof ScoreSaberV2LeaderboardRealmTokenSchema>;
