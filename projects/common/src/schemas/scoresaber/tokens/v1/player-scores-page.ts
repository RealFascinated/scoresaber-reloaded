import { Type, type StaticDecode } from "typebox";
import { ScoreSaberMetadataTokenSchema } from "./metadata";
import { ScoreSaberPlayerScoreTokenSchema } from "./player-score";

export const ScoreSaberPlayerScoresPageTokenSchema = Type.Object({
  playerScores: Type.Array(ScoreSaberPlayerScoreTokenSchema),

  metadata: ScoreSaberMetadataTokenSchema,
});

export type ScoreSaberPlayerScoresPageToken = StaticDecode<typeof ScoreSaberPlayerScoresPageTokenSchema>;
