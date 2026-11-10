import { Type, type StaticDecode } from "@sinclair/typebox";

const CurvePointSchema = Type.Tuple([Type.Number(), Type.Number()]);

export const RealmPpCurveResponseSchema = Type.Object({
  /** Accuracy (0-1) to pp multiplier, sorted by ascending accuracy */
  curve: Type.Array(CurvePointSchema),
  /** Positive modifier curve, sorted by ascending accuracy */
  positiveModifierCurve: Type.Array(CurvePointSchema),
});
export type RealmPpCurveResponse = StaticDecode<typeof RealmPpCurveResponseSchema>;
