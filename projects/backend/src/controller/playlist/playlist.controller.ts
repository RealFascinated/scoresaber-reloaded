import { playlistSchema } from "@ssr/common/schemas/ssr/playlist/playlist";
import { Elysia } from "elysia";
import { z } from "zod";
import PlaylistService, { PlaylistIdsSchema } from "../../service/playlist/playlist.service";

export default function playlistController(app: Elysia) {
  return app.group("/playlist", app =>
    app
      .get(
        "/:id",
        async ({ params: { id } }) => {
          return await PlaylistService.getPlaylist(id);
        },
        {
          tags: ["Playlist"],
          params: z.object({
            id: PlaylistIdsSchema,
          }),
          response: playlistSchema,
          detail: {
            description: "Gets a playlist by id",
          },
        }
      )
      .get(
        "/scoresaber-custom-ranked-maps",
        async ({ query: { config } }) => {
          return await PlaylistService.createCustomRankedPlaylist(config);
        },
        {
          tags: ["Playlist"],
          query: z.object({
            config: z.string(),
          }),
          response: playlistSchema,
          detail: {
            description: "Create a custom ranked playlist",
          },
        }
      )
      .get(
        "/snipe",
        async ({ query: { user, toSnipe, settings } }) => {
          return await PlaylistService.getSnipePlaylist(user, toSnipe, settings);
        },
        {
          tags: ["Playlist"],
          query: z.object({
            user: z.string(),
            toSnipe: z.string(),
            settings: z.string().optional(),
          }),
          response: playlistSchema,
          detail: {
            description: "Create a snipe playlist",
          },
        }
      )
      .get(
        "/self",
        async ({ query: { user, settings } }) => {
          return await PlaylistService.getSelfPlaylist(user, settings);
        },
        {
          tags: ["Playlist"],
          query: z.object({
            user: z.string(),
            settings: z.string().optional(),
          }),
          response: playlistSchema,
          detail: {
            description: "Create a self playlist",
          },
        }
      )
  );
}
