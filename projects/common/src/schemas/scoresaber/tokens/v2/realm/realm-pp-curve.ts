import { Type, type StaticDecode } from "typebox";

const CurvePointSchema = Type.Tuple([Type.Number(), Type.Number()]);

export const ScoreSaberV2RealmPpCurveTokenSchema = Type.Object({
  curve: Type.Array(CurvePointSchema),
  positiveModifierCurve: Type.Array(CurvePointSchema),
});

export type ScoreSaberV2RealmPpCurveToken = StaticDecode<typeof ScoreSaberV2RealmPpCurveTokenSchema>;
