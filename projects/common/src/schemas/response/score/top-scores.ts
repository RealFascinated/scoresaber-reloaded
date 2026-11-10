import { Type, type StaticDecode } from "typebox";
import { PaginationMetadataSchema } from "../../pagination";
import { PlayerScoreSchema } from "./player-scores";

export const TopScoresPageResponseSchema = Type.Object({
  items: Type.Array(PlayerScoreSchema),
  metadata: PaginationMetadataSchema,
});

export type TopScoresPageResponse = StaticDecode<typeof TopScoresPageResponseSchema>;
