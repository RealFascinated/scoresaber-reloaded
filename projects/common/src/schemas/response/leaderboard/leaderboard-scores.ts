import { Type, type StaticDecode } from "typebox";
import { BeatSaverMapSchema } from "../../beatsaver/map/map";
import { PaginationMetadataSchema } from "../../pagination";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";
import { ScoreSaberScoreSchema } from "../../scoresaber/score/score";

export const LeaderboardScoresResponseSchema = Type.Object({
  scores: Type.Array(ScoreSaberScoreSchema),

  leaderboard: ScoreSaberLeaderboardSchema,

  beatSaver: Type.Optional(BeatSaverMapSchema),

  metadata: PaginationMetadataSchema,
});

export type LeaderboardScoresResponse = StaticDecode<typeof LeaderboardScoresResponseSchema>;
