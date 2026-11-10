import { Type, type StaticDecode } from "typebox";
import { ScoreSaberV2MetadataTokenSchema } from "../metadata";

export const ScoreSaberV2LeaderboardScoreTokenSchema = Type.Object({
  id: Type.Number(),
  pp: Type.Number(),
  personalBest: Type.Boolean(),
  player: Type.Object({
    id: Type.String(),
  }),
});

export type ScoreSaberV2LeaderboardScoreToken = StaticDecode<typeof ScoreSaberV2LeaderboardScoreTokenSchema>;

export const ScoreSaberV2LeaderboardScoresPageTokenSchema = Type.Object({
  data: Type.Array(ScoreSaberV2LeaderboardScoreTokenSchema),
  metadata: ScoreSaberV2MetadataTokenSchema,
});

export type ScoreSaberV2LeaderboardScoresPageToken = StaticDecode<
  typeof ScoreSaberV2LeaderboardScoresPageTokenSchema
>;
