import { z } from "zod";

export const MapDifficultySchema = z
  .union([
    z.literal("Easy"),
    z.literal("Normal"),
    z.literal("Hard"),
    z.literal("Expert"),
    z.literal("ExpertPlus"),
    z.literal("Unknown"),
  ])
  .default("Unknown");
export type MapDifficulty = z.infer<typeof MapDifficultySchema>;
