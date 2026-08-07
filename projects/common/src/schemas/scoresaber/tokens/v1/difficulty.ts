import { Type, type StaticDecode } from "@sinclair/typebox";

export const ScoreSaberDifficultyTokenSchema = Type.Object({
  leaderboardId: Type.Number(),
  difficulty: Type.Number(),
  gameMode: Type.String(),
  difficultyRaw: Type.String(),
});

export type ScoreSaberDifficultyToken = StaticDecode<typeof ScoreSaberDifficultyTokenSchema>;
