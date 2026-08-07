import { Type } from "@sinclair/typebox";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const BeatSaverMapDifficultySchema = Type.Object({
  njs: Type.Number(),
  offset: Type.Number(),
  notes: Type.Number(),
  bombs: Type.Number(),
  obstacles: Type.Number(),
  nps: Type.Number(),
  length: Type.Number(),
  characteristic: MapCharacteristicSchema,
  difficulty: MapDifficultySchema,
  events: Type.Number(),
  chroma: Type.Boolean(),
  mappingExtensions: Type.Boolean(),
  noodleExtensions: Type.Boolean(),
  cinema: Type.Boolean(),
  seconds: Type.Number(),
  maxScore: Type.Number(),
  label: Type.String(),
});
