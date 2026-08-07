import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberV2LeaderboardDifficultyTokenSchema = Type.Object({
  id: Type.Number(),
  difficulty: Type.Number(),
  rawDifficulty: Type.String(),
  gameMode: Type.String(),
});

export type ScoreSaberV2LeaderboardDifficultyToken = StaticDecode<
  typeof ScoreSaberV2LeaderboardDifficultyTokenSchema
>;
