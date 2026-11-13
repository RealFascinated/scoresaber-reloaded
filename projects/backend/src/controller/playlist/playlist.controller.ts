import {
  CustomRankedPlaylistQuerySchema,
  PlaylistResponseSchema,
  SelfPlaylistQuerySchema,
  SnipePlaylistQuerySchema,
} from "@ssr/common/schemas/ssr/playlist/playlist-route";
import { Elysia, t } from "elysia";
import { playlistToBplist } from "../../service/playlist/playlist-to-bplist";
import PlaylistService, { PlaylistIdsSchema } from "../../service/playlist/playlist.service";

/** Serializes to BPLIST when the request path asks for it (`.bplist` suffix). */
function toBplistIfRequested(
  playlist: Awaited<ReturnType<typeof PlaylistService.getSelfPlaylist>>,
  path: string
) {
  return path.endsWith(".bplist") ? playlistToBplist(playlist) : playlist;
}

export default function playlistController(app: Elysia) {
  return app.group("/playlist", app =>
    app
      .get(
        "/:id",
        {
          tags: ["Playlist"],
          params: t.Object({
            id: PlaylistIdsSchema,
          }),
          response: PlaylistResponseSchema,
          detail: {
            description: "Gets a playlist by id",
          },
        },
        async ({ params: { id } }) => {
          const playlist = await PlaylistService.getPlaylist(id);
          return toBplistIfRequested(playlist, id);
        }
      )
      .get(
        "/reweight/:reweightId",
        {
          tags: ["Playlist"],
          params: t.Object({
            reweightId: t.String({ pattern: "^[1-9][0-9]*(\\.bplist)?$" }),
          }),
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a playlist of the maps a reweight re-rated (add .bplist for BPLIST)",
          },
        },
        async ({ params: { reweightId }, path }) => {
          const playlist = await PlaylistService.getReweightPlaylist(Number.parseInt(reweightId, 10));
          return toBplistIfRequested(playlist, path);
        }
      )
      .get(
        "/scoresaber-custom-ranked-maps",
        {
          tags: ["Playlist"],
          query: CustomRankedPlaylistQuerySchema,
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a custom ranked playlist",
          },
        },
        async ({ query: { config }, path }) => {
          const playlist = await PlaylistService.createCustomRankedPlaylist(config);
          return toBplistIfRequested(playlist, path);
        }
      )
      .get(
        "/scoresaber-custom-ranked-maps.bplist",
        {
          tags: ["Playlist"],
          query: CustomRankedPlaylistQuerySchema,
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a custom ranked playlist (BPLIST)",
          },
        },
        async ({ query: { config }, path }) => {
          const playlist = await PlaylistService.createCustomRankedPlaylist(config);
          return toBplistIfRequested(playlist, path);
        }
      )
      .get(
        "/snipe",
        {
          tags: ["Playlist"],
          query: SnipePlaylistQuerySchema,
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a snipe playlist",
          },
        },
        async ({ query: { user, toSnipe, settings }, path }) => {
          const playlist = await PlaylistService.getSnipePlaylist(user, toSnipe, settings);
          return toBplistIfRequested(playlist, path);
        }
      )
      .get(
        "/snipe.bplist",
        {
          tags: ["Playlist"],
          query: SnipePlaylistQuerySchema,
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a snipe playlist (BPLIST)",
          },
        },
        async ({ query: { user, toSnipe, settings }, path }) => {
          const playlist = await PlaylistService.getSnipePlaylist(user, toSnipe, settings);
          return toBplistIfRequested(playlist, path);
        }
      )
      .get(
        "/self",
        {
          tags: ["Playlist"],
          query: SelfPlaylistQuerySchema,
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a self playlist",
          },
        },
        async ({ query: { user, settings }, path }) => {
          const playlist = await PlaylistService.getSelfPlaylist(user, settings);
          return toBplistIfRequested(playlist, path);
        }
      )
      .get(
        "/self.bplist",
        {
          tags: ["Playlist"],
          query: SelfPlaylistQuerySchema,
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a self playlist (BPLIST)",
          },
        },
        async ({ query: { user, settings }, path }) => {
          const playlist = await PlaylistService.getSelfPlaylist(user, settings);
          return toBplistIfRequested(playlist, path);
        }
      )
  );
}
