import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2LeaderboardStatusTokenSchema = Type.Union([
  Type.Literal("UNRANKED"),
  Type.Literal("RANKED"),
  Type.Literal("QUALIFIED"),
  Type.Literal("LOVED"),
]);

export type ScoreSaberV2LeaderboardStatusToken = StaticDecode<
  typeof ScoreSaberV2LeaderboardStatusTokenSchema
>;
