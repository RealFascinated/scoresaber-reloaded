import { z } from "zod";
import { PaginationMetadataSchema } from "../../pagination";
import { BeatSaverMapSchema } from "../../beatsaver/map/map";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScoreSchema } from "../../scoresaber/score/medal-score";
import { ScoreSaberScoreSchema } from "../../scoresaber/score/score";

export const PlayerScoreSchema = z.object({
  score: ScoreSaberScoreSchema,
  leaderboard: ScoreSaberLeaderboardSchema,
  beatSaver: BeatSaverMapSchema.optional(),
});

export const PlayerScoresPageResponseSchema = z.object({
  items: z.array(PlayerScoreSchema),
  metadata: PaginationMetadataSchema,
});

export const MedalPlayerScoreSchema = z.object({
  score: ScoreSaberMedalScoreSchema,
  leaderboard: ScoreSaberLeaderboardSchema,
  beatSaver: BeatSaverMapSchema.optional(),
});

export const MedalPlayerScoresPageResponseSchema = z.object({
  items: z.array(MedalPlayerScoreSchema),
  metadata: PaginationMetadataSchema,
});

export type PlayerScore = z.infer<typeof PlayerScoreSchema>;
export type PlayerScoresPageResponse = z.infer<typeof PlayerScoresPageResponseSchema>;
export type MedalPlayerScore = z.infer<typeof MedalPlayerScoreSchema>;
export type MedalPlayerScoresPageResponse = z.infer<typeof MedalPlayerScoresPageResponseSchema>;
