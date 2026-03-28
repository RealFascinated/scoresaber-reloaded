import { z } from "zod";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const ScoreSaberLeaderboardDifficultySchema = z.object({
  id: z.number(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
});
export type ScoreSaberLeaderboardDifficulty = z.infer<typeof ScoreSaberLeaderboardDifficultySchema>;
