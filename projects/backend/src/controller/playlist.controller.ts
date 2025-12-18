import { playlistToBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { Elysia } from "elysia";
import { z } from "zod";
import PlaylistService from "../service/playlist/playlist.service";

export default function playlistController(app: Elysia) {
  return app.group("/playlist", app =>
    app
      .get(
        "/:playlistId",
        async ({ params: { playlistId }, query: { config } }) => {
          return playlistToBeatSaberPlaylist(
            await PlaylistService.getPlaylist(
              playlistId.includes(".") ? playlistId.split(".")[0] : playlistId,
              config
            )
          );
        },
        {
          tags: ["Playlist"],
          params: z.object({
            playlistId: z.string().regex(/^[^/]+(?:\.[a-zA-Z0-9]+)?$/),
          }),
          query: z.object({
            config: z.string().optional(),
          }),
          detail: {
            description: "Fetch a playlist by its id",
          },
        }
      )
      .get(
        "/snipe",
        async ({ query: { user, toSnipe, settings } }) => {
          const response = new Response(
            JSON.stringify(
              await playlistToBeatSaberPlaylist(
                await PlaylistService.getSnipePlaylist(user, toSnipe, settings)
              ),
              null,
              2
            )
          );
          response.headers.set("Content-Type", "application/json");
          return response;
        },
        {
          tags: ["Playlist"],
          query: z.object({
            user: z.string(),
            toSnipe: z.string(),
            settings: z.string().optional(),
          }),
          detail: {
            description: "Fetch a snipe playlist",
          },
        }
      )
  );
}
