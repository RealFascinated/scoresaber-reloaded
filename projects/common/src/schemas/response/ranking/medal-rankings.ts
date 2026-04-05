import z from "zod";
import type { Page } from "../../../pagination";

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

export type PlayerMedalRankingsResponse = Page<MedalRankingPlayer> & {
  countryMetadata: Record<string, number>;
};
