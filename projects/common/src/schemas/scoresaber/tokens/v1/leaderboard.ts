import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberDifficultyTokenSchema } from "./difficulty";
import { ScoreSaberScoreTokenSchema } from "./score";

export const ScoreSaberLeaderboardTokenSchema = Type.Object({
  id: Type.Number(),
  songHash: Type.String(),
  songName: Type.String(),
  songSubName: Type.String(),
  songAuthorName: Type.String(),
  levelAuthorName: Type.String(),
  difficulty: ScoreSaberDifficultyTokenSchema,
  maxScore: Type.Number(),
  maxScoreEx: Type.Number(),
  createdDate: Type.String(),
  rankedDate: Type.Union([Type.String(), Type.Null()]),
  qualifiedDate: Type.Union([Type.String(), Type.Null()]),
  lovedDate: Type.Union([Type.String(), Type.Null()]),
  ranked: Type.Boolean(),
  qualified: Type.Boolean(),
  loved: Type.Boolean(),
  maxPP: Type.Number(),
  stars: Type.Number(),
  positiveModifiers: Type.Boolean(),
  playerScore: Type.Union([ScoreSaberScoreTokenSchema, Type.Null()]),
  plays: Type.Number(),
  dailyPlays: Type.Number(),
  coverImage: Type.String(),
  difficulties: Type.Union([Type.Array(ScoreSaberDifficultyTokenSchema), Type.Null()]),
});

export type ScoreSaberLeaderboardToken = StaticDecode<typeof ScoreSaberLeaderboardTokenSchema>;
