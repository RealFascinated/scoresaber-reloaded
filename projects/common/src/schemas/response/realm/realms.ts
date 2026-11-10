import { Type, type StaticDecode } from "typebox";
import { ScoreSaberV2RealmTokenSchema } from "../../scoresaber/tokens/v2/realm/realm";

export const RealmsResponseSchema = Type.Array(ScoreSaberV2RealmTokenSchema);
export type RealmsResponse = StaticDecode<typeof RealmsResponseSchema>;
