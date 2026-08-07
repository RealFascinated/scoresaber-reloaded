import { Type, type StaticDecode } from "@sinclair/typebox";
import { PaginationMetadataSchema } from "../../pagination";
import { ScoreSaberScoreSchema } from "../../scoresaber/score/score";

export const ScoreSaberScoresPageResponseSchema = Type.Object({
  items: Type.Array(ScoreSaberScoreSchema),
  metadata: PaginationMetadataSchema,
});

export type ScoreSaberScoresPageResponse = StaticDecode<typeof ScoreSaberScoresPageResponseSchema>;
