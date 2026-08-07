import { Type, type StaticDecode } from "@sinclair/typebox";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const ScoreSaberLeaderboardDifficultySchema = Type.Object({
  id: Type.Number(),
  stars: Type.Number(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
});
export type ScoreSaberLeaderboardDifficulty = StaticDecode<typeof ScoreSaberLeaderboardDifficultySchema>;
