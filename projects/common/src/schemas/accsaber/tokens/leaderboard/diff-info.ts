import { z } from "zod";
import { MapDifficultySchema } from "../../../../score/map-difficulty";

export const accSaberDiffInfoSchema = z.object({
  type: z.string(),
  diff: MapDifficultySchema,
});
