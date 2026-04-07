import z from "zod";
import { PaginationMetadataSchema } from "../../pagination";

export const MedalsGlobalRankingSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  country: z.string().nullable(),
  medals: z.number(),
  medalsRank: z.number(),
  medalsCountryRank: z.number(),
  trackedSince: z.coerce.date(),
  joinedDate: z.coerce.date(),
});

export type MedalRankingPlayer = z.infer<typeof MedalsGlobalRankingSchema>;

export const PlayerMedalRankingsResponseSchema = z.object({
  items: z.array(MedalsGlobalRankingSchema),
  metadata: PaginationMetadataSchema,
  countryMetadata: z.record(z.string(), z.number()),
});

export type PlayerMedalRankingsResponse = z.infer<typeof PlayerMedalRankingsResponseSchema>;
