import { Type, type StaticDecode } from "typebox";
import { PaginationMetadataSchema } from "../pagination";
import {
  PlayerReweightSchema,
  ReweightLeaderboardChangeSchema,
  ReweightMarkerSchema,
  ReweightPlayerChangeSchema,
  ReweightSchema,
  ReweightScoreChangeSchema,
} from "./reweight";

export const ReweightsPageResponseSchema = Type.Object({
  items: Type.Array(ReweightSchema),
  metadata: PaginationMetadataSchema,
});

export const ReweightResponseSchema = Type.Object({
  reweight: ReweightSchema,
  leaderboards: Type.Array(ReweightLeaderboardChangeSchema),
});

export const ReweightPlayersPageResponseSchema = Type.Object({
  items: Type.Array(ReweightPlayerChangeSchema),
  metadata: PaginationMetadataSchema,
});

export const ReweightMarkersResponseSchema = Type.Array(ReweightMarkerSchema);

export const PlayerReweightsResponseSchema = Type.Array(PlayerReweightSchema);

export const PlayerReweightScoresResponseSchema = Type.Array(ReweightScoreChangeSchema);

export type ReweightsPageResponse = StaticDecode<typeof ReweightsPageResponseSchema>;
export type ReweightResponse = StaticDecode<typeof ReweightResponseSchema>;
export type ReweightPlayersPageResponse = StaticDecode<typeof ReweightPlayersPageResponseSchema>;
export type ReweightMarkersResponse = StaticDecode<typeof ReweightMarkersResponseSchema>;
export type PlayerReweightsResponse = StaticDecode<typeof PlayerReweightsResponseSchema>;
export type PlayerReweightScoresResponse = StaticDecode<typeof PlayerReweightScoresResponseSchema>;
