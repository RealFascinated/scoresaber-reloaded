import { z } from "zod";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const BeatSaverMapDifficultySchema = z.object({
  njs: z.number(),
  offset: z.number(),
  notes: z.number(),
  bombs: z.number(),
  obstacles: z.number(),
  nps: z.number(),
  length: z.number(),
  characteristic: MapCharacteristicSchema,
  difficulty: MapDifficultySchema,
  events: z.number(),
  chroma: z.boolean(),
  mappingExtensions: z.boolean(),
  noodleExtensions: z.boolean(),
  cinema: z.boolean(),
  seconds: z.number(),
  maxScore: z.number(),
  label: z.string(),
});
