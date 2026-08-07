import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberLeaderboardTokenSchema } from "./leaderboard";
import { ScoreSaberScoreTokenSchema } from "./score";

export const ScoreSaberPlayerScoreTokenSchema = Type.Object({
  /**
   * The score of the player score.
   */
  score: ScoreSaberScoreTokenSchema,

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboardTokenSchema,
});

export type ScoreSaberPlayerScoreToken = StaticDecode<typeof ScoreSaberPlayerScoreTokenSchema>;
