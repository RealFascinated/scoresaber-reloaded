import { Type } from "typebox";
import { playlistSchema } from "./playlist";

export const PlaylistResponseSchema = Type.Union([playlistSchema, Type.String()]);

export const CustomRankedPlaylistQuerySchema = Type.Object({
  config: Type.String(),
});

export const SnipePlaylistQuerySchema = Type.Object({
  user: Type.String(),
  toSnipe: Type.String(),
  settings: Type.Optional(Type.String()),
});

export const SelfPlaylistQuerySchema = Type.Object({
  user: Type.String(),
  settings: Type.Optional(Type.String()),
});
