import { z } from "zod";
import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";
import { PaginationMetadataSchema } from "../../pagination";

export const PlayerRankingsResponseSchema = z.object({
  items: z.array(z.custom<ScoreSaberPlayer>()),
  metadata: PaginationMetadataSchema,
});

export type PlayerRankingsResponse = z.infer<typeof PlayerRankingsResponseSchema>;
