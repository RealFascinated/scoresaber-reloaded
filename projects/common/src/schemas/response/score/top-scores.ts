import { z } from "zod";
import { PaginationMetadataSchema } from "../../pagination";
import { PlayerScoreSchema } from "./player-scores";

export const TopScoresPageResponseSchema = z.object({
  items: z.array(PlayerScoreSchema),
  metadata: PaginationMetadataSchema,
});

export type TopScoresPageResponse = z.infer<typeof TopScoresPageResponseSchema>;
