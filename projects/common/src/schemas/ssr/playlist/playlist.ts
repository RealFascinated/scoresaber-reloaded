import { z } from "zod";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const playlistSongSchema = z.object({
  songName: z.string(),
  levelAuthorName: z.string(),
  hash: z.string(),
  difficulties: z.array(
    z.object({
      difficulty: MapDifficultySchema,
      characteristic: MapCharacteristicSchema,
    })
  ),
});

export const playlistCustomDataSchema = z.object({
  syncURL: z.string(),
});

export const playlistSchema = z.object({
  playlistTitle: z.string(),
  playlistAuthor: z.string(),
  customData: playlistCustomDataSchema.optional(),
  songs: z.array(playlistSongSchema),
  image: z.string().optional(),
});

export type Playlist = z.infer<typeof playlistSchema>;
