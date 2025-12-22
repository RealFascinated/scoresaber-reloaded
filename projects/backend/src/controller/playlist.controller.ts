import { playlistToBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { Elysia } from "elysia";
import { z } from "zod";
import PlaylistService from "../service/playlist/playlist.service";

export default function playlistController(app: Elysia) {
  return app.group("/playlist", app =>
    app
      .get(
        "/:playlistId",
        async ({ params: { playlistId } }) => {
          return playlistToBeatSaberPlaylist(
            await PlaylistService.getPlaylist(
              playlistId.includes(".") ? playlistId.split(".")[0] : playlistId
            )
          );
        },
        {
          tags: ["Playlist"],
          params: z.object({
            playlistId: z.string().regex(/^[^/]+(?:\.[a-zA-Z0-9]+)?$/),
          }),
          detail: {
            description: "Fetch playlist",
          },
        }
      )
      .get(
        "/scoresaber-custom-ranked-maps",
        async ({ query: { config } }) => {
          return playlistToBeatSaberPlaylist(
            await PlaylistService.createCustomRankedPlaylist(config)
          );
        },
        {
          tags: ["Playlist"],
          query: z.object({
            config: z.string(),
          }),
          detail: {
            description: "Create a custom ranked playlist",
          },
        }
      )
      .get(
        "/snipe",
        async ({ query: { user, toSnipe, settings } }) => {
          return playlistToBeatSaberPlaylist(
            await PlaylistService.getSnipePlaylist(user, toSnipe, settings)
          );
        },
        {
          tags: ["Playlist"],
          query: z.object({
            user: z.string(),
            toSnipe: z.string(),
            settings: z.string().optional(),
          }),
          detail: {
            description: "Create a snipe playlist",
          },
        }
      )
  );
}
