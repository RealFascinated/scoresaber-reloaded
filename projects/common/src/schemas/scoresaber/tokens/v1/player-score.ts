import { Type, type StaticDecode } from "typebox";
import { ScoreSaberLeaderboardTokenSchema } from "./leaderboard";
import { ScoreSaberScoreTokenSchema } from "./score";

export const ScoreSaberPlayerScoreTokenSchema = Type.Object({
  score: ScoreSaberScoreTokenSchema,

  leaderboard: ScoreSaberLeaderboardTokenSchema,
});

export type ScoreSaberPlayerScoreToken = StaticDecode<typeof ScoreSaberPlayerScoreTokenSchema>;
