import { Type, type StaticDecode } from "typebox";

export const BeatLeaderOverlayDataResponseSchema = Type.Object({
  /** The BeatLeader score id. */
  scoreId: Type.Integer(),
  /** `replay` when the data comes from the score's replay, `final-only` when there is no replay. */
  source: Type.Union([Type.Literal("replay"), Type.Literal("final-only")]),
  /** The final accuracy of the score, in percent. */
  finalAccuracy: Type.Number(),
  /** `accuracyBySecond[i]` is the running accuracy (percent) at song time `i` seconds, null before the first note. */
  accuracyBySecond: Type.Array(Type.Union([Type.Number(), Type.Null()])),
});
export type BeatLeaderOverlayDataResponse = StaticDecode<typeof BeatLeaderOverlayDataResponseSchema>;
