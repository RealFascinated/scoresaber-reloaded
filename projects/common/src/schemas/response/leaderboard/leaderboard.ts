import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverMapSchema } from "../../beatsaver/map/map";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";

export const LeaderboardResponseSchema = Type.Object({
  /**
   * The scoresaber leaderboard.
   */
  leaderboard: ScoreSaberLeaderboardSchema,

  /**
   * The beatsaver map associated with this leaderboard.
   */
  beatsaver: Type.Optional(BeatSaverMapSchema),
});

export type LeaderboardResponse = StaticDecode<typeof LeaderboardResponseSchema>;
