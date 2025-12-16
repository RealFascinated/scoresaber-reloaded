import { z } from "zod";

export const MapDifficultySchema = z
  .enum(["Easy", "Normal", "Hard", "Expert", "ExpertPlus"])
  .default("Easy");
export type MapDifficulty = z.infer<typeof MapDifficultySchema>;
