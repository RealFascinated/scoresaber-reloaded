import { generateBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { Elysia, t } from "elysia";
import PlaylistService, { PlaylistId } from "../service/playlist/playlist.service";

export default function playlistController(app: Elysia) {
  return app.group("/playlist", app =>
    app
      .get(
        "/:id",
        async ({ params: { id }, query: { config, download } }) => {
          const playlistId = (id.includes(".") ? id.split(".")[0] : id) as PlaylistId;
          const extension = id.includes(".") ? id.split(".")[1] : "bplist";

          const response = new Response(
            JSON.stringify(
              await generateBeatSaberPlaylist(await PlaylistService.getPlaylist(playlistId, config)),
              null,
              2
            )
          );
          response.headers.set("Content-Type", "application/json");
          if (download) {
            response.headers.set("Content-Disposition", `attachment; filename="ssr-${playlistId}.${extension}"`);
          }
          return response;
        },
        {
          tags: ["Playlist"],
          params: t.Object({
            id: t.String({ required: true, pattern: "^[^/]+(?:\\.[a-zA-Z0-9]+)?$" }),
          }),
          query: t.Object({
            config: t.Optional(t.String()),
            download: t.Optional(t.Boolean()),
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
          query: t.Object({
            user: t.String({ required: true }),
            toSnipe: t.String({ required: true }),
            settings: t.Optional(t.String()),
          }),
          detail: {
            description: "Fetch a snipe playlist",
          },
        }
      )
  );
}
