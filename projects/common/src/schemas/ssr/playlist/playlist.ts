import { Type, type StaticDecode } from "@sinclair/typebox";
import { MapCharacteristicSchema } from "../../map/map-characteristic";
import { MapDifficultySchema } from "../../map/map-difficulty";

export const playlistSongSchema = Type.Object({
  songName: Type.String(),
  levelAuthorName: Type.String(),
  hash: Type.String(),
  difficulties: Type.Array(
    Type.Object({
      difficulty: MapDifficultySchema,
      characteristic: MapCharacteristicSchema,
    })
  ),
});

export const playlistCustomDataSchema = Type.Object({
  syncURL: Type.String(),
});

export const playlistSchema = Type.Object({
  playlistTitle: Type.String(),
  playlistAuthor: Type.String(),
  customData: Type.Optional(playlistCustomDataSchema),
  songs: Type.Array(playlistSongSchema),
  image: Type.Optional(Type.String()),
});

export type Playlist = StaticDecode<typeof playlistSchema>;
