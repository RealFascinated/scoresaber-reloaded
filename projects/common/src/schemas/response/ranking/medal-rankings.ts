import { Type, type StaticDecode } from "@sinclair/typebox";
import { PaginationMetadataSchema } from "../../pagination";

export const MedalsGlobalRankingSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  avatar: Type.String(),
  country: Type.Union([Type.String(), Type.Null()]),
  medals: Type.Number(),
  medalsRank: Type.Number(),
  medalsCountryRank: Type.Number(),
  trackedSince: Type.Date(),
  joinedDate: Type.Date(),
});

export type MedalRankingPlayer = StaticDecode<typeof MedalsGlobalRankingSchema>;

export const PlayerMedalRankingsResponseSchema = Type.Object({
  items: Type.Array(MedalsGlobalRankingSchema),
  metadata: PaginationMetadataSchema,
});

export type PlayerMedalRankingsResponse = StaticDecode<typeof PlayerMedalRankingsResponseSchema>;
