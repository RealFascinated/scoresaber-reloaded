import { Type } from "typebox";
import { MapCharacteristicSchema } from "../map/map-characteristic";
import { MapDifficultySchema } from "../map/map-difficulty";

export const BeatSaverMapParamsSchema = Type.Object({
  // BeatSaver map hashes: legacy 32-char hex (MD5 of the map zip) and
  // the current 40-char hex (SHA1 of the version zip). Accept both;
  // reject path separators and over-long values that could reach the
  // upstream API or overflow the varchar(64) hash column.
  hash: Type.String({ pattern: "^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{40})$" }),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
});
