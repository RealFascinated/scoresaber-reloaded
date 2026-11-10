import { Type, type StaticDecode } from "typebox";
import { PlayerScoreSchema } from "../score/player-scores";

export const PinnedScoresResponseSchema = Type.Object({
  /** The pinned scores, in the order they were pinned. */
  items: Type.Array(PlayerScoreSchema),
});
export type PinnedScoresResponse = StaticDecode<typeof PinnedScoresResponseSchema>;

export const PinnedScoreIdsResponseSchema = Type.Object({
  /** The ids of the scores the user pinned, in the order they were pinned. */
  scoreIds: Type.Array(Type.Integer()),
});
export type PinnedScoreIdsResponse = StaticDecode<typeof PinnedScoreIdsResponseSchema>;
