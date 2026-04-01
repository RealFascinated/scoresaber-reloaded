import { z } from "zod";
import { MapDifficultySchema } from "../../../map/map-difficulty";

export const accSaberDiffInfoSchema = z.object({
  type: z.string(),
  diff: MapDifficultySchema,
});
