import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberMetadataTokenSchema } from "./metadata";
import { ScoreSaberScoreTokenSchema } from "./score";

export const ScoreSaberLeaderboardScoresPageTokenSchema = Type.Object({
  /**
   * The scores on this page.
   */
  scores: Type.Array(ScoreSaberScoreTokenSchema),

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadataTokenSchema,
});

export type ScoreSaberLeaderboardScoresPageToken = StaticDecode<
  typeof ScoreSaberLeaderboardScoresPageTokenSchema
>;
