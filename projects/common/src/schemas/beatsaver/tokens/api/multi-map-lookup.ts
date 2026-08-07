import { Type, type StaticDecode } from "@sinclair/typebox";
import { BeatSaverMapTokenSchema } from "../map";

export const BeatSaverMultiMapLookupSchema = Type.Record(Type.String(), BeatSaverMapTokenSchema);

export type BeatSaverMultiMapLookup = StaticDecode<typeof BeatSaverMultiMapLookupSchema>;
