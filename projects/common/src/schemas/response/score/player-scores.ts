import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverMapSchema } from "../../beatsaver/map/map";
import { PaginationMetadataSchema } from "../../pagination";
import { ScoreSaberLeaderboardSchema } from "../../scoresaber/leaderboard/leaderboard";
import { ScoreSaberMedalScoreSchema } from "../../scoresaber/score/medal-score";
import { ScoreSaberScoreSchema } from "../../scoresaber/score/score";

export const PlayerScoreSchema = Type.Object({
  score: ScoreSaberScoreSchema,
  leaderboard: ScoreSaberLeaderboardSchema,
  beatSaver: Type.Optional(BeatSaverMapSchema),
});

export const PlayerScoresPageResponseSchema = Type.Object({
  items: Type.Array(PlayerScoreSchema),
  metadata: PaginationMetadataSchema,
});

export const MedalPlayerScoreSchema = Type.Object({
  score: ScoreSaberMedalScoreSchema,
  leaderboard: ScoreSaberLeaderboardSchema,
  beatSaver: Type.Optional(BeatSaverMapSchema),
});

export const MedalPlayerScoresPageResponseSchema = Type.Object({
  items: Type.Array(MedalPlayerScoreSchema),
  metadata: PaginationMetadataSchema,
});

export type PlayerScore = StaticDecode<typeof PlayerScoreSchema>;
export type PlayerScoresPageResponse = StaticDecode<typeof PlayerScoresPageResponseSchema>;
export type MedalPlayerScore = StaticDecode<typeof MedalPlayerScoreSchema>;
export type MedalPlayerScoresPageResponse = StaticDecode<typeof MedalPlayerScoresPageResponseSchema>;
