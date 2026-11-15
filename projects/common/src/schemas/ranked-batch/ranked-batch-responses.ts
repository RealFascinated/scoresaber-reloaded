import { Type, type StaticDecode } from "typebox";
import { PaginationMetadataSchema } from "../pagination";
import {
  PlayerRankedBatchSchema,
  RankedBatchLeaderboardChangeSchema,
  RankedBatchMarkerSchema,
  RankedBatchNewLeaderboardSchema,
  RankedBatchPlayerChangeSchema,
  RankedBatchSchema,
  RankedBatchScoreChangeSchema,
} from "./ranked-batch";

export const RankedBatchesPageResponseSchema = Type.Object({
  items: Type.Array(RankedBatchSchema),
  metadata: PaginationMetadataSchema,
});

export const RankedBatchResponseSchema = Type.Object({
  rankedBatch: RankedBatchSchema,
  /** The maps the ranked batch re-rated. */
  leaderboards: Type.Array(RankedBatchLeaderboardChangeSchema),
  /** The maps that became ranked in the ranked batch. */
  newLeaderboards: Type.Array(RankedBatchNewLeaderboardSchema),
});

export const RankedBatchPlayersPageResponseSchema = Type.Object({
  items: Type.Array(RankedBatchPlayerChangeSchema),
  metadata: PaginationMetadataSchema,
});

export const RankedBatchMarkersResponseSchema = Type.Array(RankedBatchMarkerSchema);

export const PlayerRankedBatchesResponseSchema = Type.Array(PlayerRankedBatchSchema);

export const PlayerRankedBatchScoresResponseSchema = Type.Array(RankedBatchScoreChangeSchema);

export type RankedBatchesPageResponse = StaticDecode<typeof RankedBatchesPageResponseSchema>;
export type RankedBatchResponse = StaticDecode<typeof RankedBatchResponseSchema>;
export type RankedBatchPlayersPageResponse = StaticDecode<typeof RankedBatchPlayersPageResponseSchema>;
export type RankedBatchMarkersResponse = StaticDecode<typeof RankedBatchMarkersResponseSchema>;
export type PlayerRankedBatchesResponse = StaticDecode<typeof PlayerRankedBatchesResponseSchema>;
export type PlayerRankedBatchScoresResponse = StaticDecode<typeof PlayerRankedBatchScoresResponseSchema>;
