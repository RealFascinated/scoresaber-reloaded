import { Type, type StaticDecode } from "typebox";
import { BeatSaverMapSchema } from "../../beatsaver/map/map";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";

export const LeaderboardResponseSchema = Type.Object({
  leaderboard: ScoreSaberLeaderboardSchema,

  beatsaver: Type.Optional(BeatSaverMapSchema),
});

export type LeaderboardResponse = StaticDecode<typeof LeaderboardResponseSchema>;
