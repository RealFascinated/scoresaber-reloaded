import { z } from "zod";
import { accSaberScoreSchema } from "../../accsaber/tokens/score/score";
import { PaginationMetadataSchema } from "../../pagination";

export const AccSaberScoresPageResponseSchema = z.object({
  items: z.array(accSaberScoreSchema),
  metadata: PaginationMetadataSchema,
});

export type AccSaberScoresPageResponse = z.infer<typeof AccSaberScoresPageResponseSchema>;
