import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverMapSchema } from "../../beatsaver/map/map";
import { PaginationMetadataSchema } from "../../pagination";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";
import { ScoreSaberScoreSchema } from "../../scoresaber/score/score";

export const LeaderboardScoresResponseSchema = Type.Object({
  /**
   * The scores that were set.
   */
  scores: Type.Array(ScoreSaberScoreSchema),

  /**
   * The leaderboard that was used.
   */
  leaderboard: ScoreSaberLeaderboardSchema,

  /**
   * The beatsaver map for the song.
   */
  beatSaver: Type.Optional(BeatSaverMapSchema),

  /**
   * The pagination metadata.
   */
  metadata: PaginationMetadataSchema,
});

export type LeaderboardScoresResponse = StaticDecode<typeof LeaderboardScoresResponseSchema>;
