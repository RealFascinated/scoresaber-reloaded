import { z } from "zod";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const McpSongRefSchema = z.object({
  leaderboardId: z.number(),
  songName: z.string(),
  songAuthor: z.string(),
  songHash: z.string(),
  stars: z.number(),
  difficulty: MapDifficultySchema,
  characteristic: MapCharacteristicSchema,
});

export type McpSongRef = z.infer<typeof McpSongRefSchema>;
