import { Type, type StaticDecode } from "typebox";
import { ScoreSaberV2LeaderboardPageTokenSchema } from "../leaderboard/leaderboards-page";
import { ScoreSaberV2PlayerDeviceTokenSchema } from "../player/player-device";

export const ScoreSaberV2ScoreTokenSchema = Type.Object({
  id: Type.Number(),
  rank: Type.Number(),
  unmodifiedScore: Type.Number(),
  modifiedScore: Type.Number(),
  accuracy: Type.Number(),
  pp: Type.Number(),
  weight: Type.Number(),
  mods: Type.Array(Type.String()),
  badCuts: Type.Number(),
  missedNotes: Type.Number(),
  maxCombo: Type.Number(),
  fullCombo: Type.Boolean(),
  hasReplay: Type.Boolean(),
  personalBest: Type.Boolean(),
  createdAt: Type.String(),
  player: Type.Object({
    id: Type.String(),
    name: Type.String(),
    country: Type.String(),
    role: Type.Union([Type.String(), Type.Null()]),
    avatar: Type.String(),
  }),
  device: Type.Union([ScoreSaberV2PlayerDeviceTokenSchema, Type.Null()]),
});

export type ScoreSaberV2ScoreToken = StaticDecode<typeof ScoreSaberV2ScoreTokenSchema>;

export const ScoreSaberV2ScoreResponseTokenSchema = Type.Object({
  score: ScoreSaberV2ScoreTokenSchema,
  leaderboard: ScoreSaberV2LeaderboardPageTokenSchema,
});

export type ScoreSaberV2ScoreResponseToken = StaticDecode<typeof ScoreSaberV2ScoreResponseTokenSchema>;
