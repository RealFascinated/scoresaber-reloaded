import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberLeaderboardPlayerInfoTokenSchema } from "./leaderboard-player-info";

export const ScoreSaberScoreTokenSchema = Type.Object({
  id: Type.Number(),
  leaderboardPlayerInfo: ScoreSaberLeaderboardPlayerInfoTokenSchema,
  rank: Type.Number(),
  baseScore: Type.Number(),
  modifiedScore: Type.Number(),
  pp: Type.Number(),
  weight: Type.Number(),
  modifiers: Type.String(),
  multiplier: Type.Number(),
  badCuts: Type.Number(),
  missedNotes: Type.Number(),
  maxCombo: Type.Number(),
  fullCombo: Type.Boolean(),
  hmd: Type.Number(),
  hasReplay: Type.Boolean(),
  timeSet: Type.String(),
  deviceHmd: Type.String(),
  deviceControllerLeft: Type.String(),
  deviceControllerRight: Type.String(),
});

export type ScoreSaberScoreToken = StaticDecode<typeof ScoreSaberScoreTokenSchema>;
