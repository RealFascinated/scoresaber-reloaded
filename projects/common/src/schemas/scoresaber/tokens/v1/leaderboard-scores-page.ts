import { Type, type StaticDecode } from "typebox";
import { ScoreSaberMetadataTokenSchema } from "./metadata";
import { ScoreSaberScoreTokenSchema } from "./score";

export const ScoreSaberLeaderboardScoresPageTokenSchema = Type.Object({
  scores: Type.Array(ScoreSaberScoreTokenSchema),

  metadata: ScoreSaberMetadataTokenSchema,
});

export type ScoreSaberLeaderboardScoresPageToken = StaticDecode<
  typeof ScoreSaberLeaderboardScoresPageTokenSchema
>;
