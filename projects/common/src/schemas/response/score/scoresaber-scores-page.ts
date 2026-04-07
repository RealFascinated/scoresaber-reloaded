import { z } from "zod";
import { PaginationMetadataSchema } from "../../pagination";
import { ScoreSaberScoreSchema } from "../../scoresaber/score/score";

export const ScoreSaberScoresPageResponseSchema = z.object({
  items: z.array(ScoreSaberScoreSchema),
  metadata: PaginationMetadataSchema,
});

export type ScoreSaberScoresPageResponse = z.infer<typeof ScoreSaberScoresPageResponseSchema>;
