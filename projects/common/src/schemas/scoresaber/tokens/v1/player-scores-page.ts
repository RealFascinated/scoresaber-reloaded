import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreSaberMetadataTokenSchema } from "./metadata";
import { ScoreSaberPlayerScoreTokenSchema } from "./player-score";

export const ScoreSaberPlayerScoresPageTokenSchema = Type.Object({
  /**
   * The scores on this page.
   */
  playerScores: Type.Array(ScoreSaberPlayerScoreTokenSchema),

  /**
   * The metadata for the page.
   */
  metadata: ScoreSaberMetadataTokenSchema,
});

export type ScoreSaberPlayerScoresPageToken = StaticDecode<typeof ScoreSaberPlayerScoresPageTokenSchema>;
