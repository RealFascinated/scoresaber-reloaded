import {
  CustomRankedPlaylistQuerySchema,
  PlaylistResponseSchema,
  SelfPlaylistQuerySchema,
  SnipePlaylistQuerySchema,
} from "@ssr/common/schemas/ssr/playlist/playlist-route";
import { SuggestedMapsPlaylistQuerySchema } from "@ssr/common/schemas/suggested-maps/suggested-maps-route";
import { Elysia, t } from "elysia";
import { playlistToBplist } from "../../service/playlist/playlist-to-bplist";
import PlaylistService, { PlaylistIdsSchema } from "../../service/playlist/playlist.service";

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
        "/ranked-batch/:rankedBatchId",
        {
          tags: ["Playlist"],
          params: t.Object({
            rankedBatchId: t.String({ pattern: "^[1-9][0-9]*(\\.bplist)?$" }),
          }),
          response: PlaylistResponseSchema,
          detail: {
            description: "Create a playlist of the maps a ranked batch re-rated (add .bplist for BPLIST)",
          },
        },
        async ({ params: { rankedBatchId }, path }) => {
          const playlist = await PlaylistService.getRankedBatchPlaylist(Number.parseInt(rankedBatchId, 10));
          return toBplistIfRequested(playlist, path);
        }
      )
      .get(
        "/suggested-maps/:playerId",
        {
          tags: ["Playlist"],
          params: t.Object({
            playerId: t.String({ pattern: "^[0-9]+(\\.bplist)?$" }),
          }),
          query: SuggestedMapsPlaylistQuerySchema,
          response: PlaylistResponseSchema,
          detail: {
            description:
              "Create a playlist of the best suggested maps for a player (add .bplist for BPLIST), fitted to their current play style",
          },
        },
        async ({ params: { playerId }, query, path }) => {
          const playlist = await PlaylistService.getSuggestedMapsPlaylist(
            playerId.replace(/\.bplist$/, ""),
            query
          );
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
