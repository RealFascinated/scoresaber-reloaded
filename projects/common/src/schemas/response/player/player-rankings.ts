import { z } from "zod";
import ScoreSaberPlayer from "../../../player/impl/scoresaber-player";
import { PaginationMetadataSchema } from "../../pagination";

export const PlayerRankingsResponseSchema = z.object({
  items: z.array(z.custom<ScoreSaberPlayer>()),
  metadata: PaginationMetadataSchema,
  countryMetadata: z.record(z.string(), z.number()),
});

export type PlayerRankingsResponse = z.infer<typeof PlayerRankingsResponseSchema>;
