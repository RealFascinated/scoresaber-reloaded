import { generateBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { Elysia } from "elysia";
import { z } from "zod";
import PlaylistService, { PlaylistId } from "../service/playlist/playlist.service";

export default function playlistController(app: Elysia) {
  return app.group("/playlist", app =>
    app
      .get(
        "/:playlistId",
        async ({ params: { playlistId }, query: { config, download } }) => {
          const id = (playlistId.includes(".") ? playlistId.split(".")[0] : playlistId) as PlaylistId;
          const extension = playlistId.includes(".") ? playlistId.split(".")[1] : "bplist";

          const response = new Response(
            JSON.stringify(await generateBeatSaberPlaylist(await PlaylistService.getPlaylist(id, config)), null, 2)
          );
          response.headers.set("Content-Type", "application/json");
          if (download) {
            response.headers.set("Content-Disposition", `attachment; filename="ssr-${id}.${extension}"`);
          }
          return response;
        },
        {
          tags: ["Playlist"],
          params: z.object({
            playlistId: z.string().regex(/^[^/]+(?:\.[a-zA-Z0-9]+)?$/),
          }),
          query: z.object({
            config: z.string().optional(),
            download: z.boolean().optional(),
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
              await generateBeatSaberPlaylist(await PlaylistService.getSnipePlaylist(user, toSnipe, settings)),
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
