import { Type, type StaticDecode } from "typebox";

export const ScoreSaberLeaderboardStatusSchema = Type.Union([
  Type.Literal("Unranked"),
  Type.Literal("Ranked"),
  Type.Literal("Qualified"),
]);
export type ScoreSaberLeaderboardStatus = StaticDecode<typeof ScoreSaberLeaderboardStatusSchema>;
