import { Type, type StaticDecode } from "@sinclair/typebox";
import { ScoreResponseSchema } from "../../accsaber/score/score";
import { BeatLeaderScoreSchema } from "../../beatleader/score/score";
import { PaginationMetadataSchema } from "../../pagination";

/**
 * An AccSaber score as served by the SSR API: the raw REST `ScoreResponse`
 * enriched with the player's matching BeatLeader score (for replay buttons).
 */
export const AccSaberScoreItemSchema = Type.Composite([
  ScoreResponseSchema,
  Type.Object({
    beatLeaderScore: Type.Optional(BeatLeaderScoreSchema),
  }),
]);

export type AccSaberScoreItem = StaticDecode<typeof AccSaberScoreItemSchema>;

export const AccSaberScoresPageResponseSchema = Type.Object({
  items: Type.Array(AccSaberScoreItemSchema),
  metadata: PaginationMetadataSchema,
});

export type AccSaberScoresPageResponse = StaticDecode<typeof AccSaberScoresPageResponseSchema>;
