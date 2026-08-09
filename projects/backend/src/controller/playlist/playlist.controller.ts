import { playlistSchema } from "@ssr/common/schemas/ssr/playlist/playlist";
import { Elysia, t } from "elysia";
import { playlistToBplist } from "../../service/playlist/playlist-to-bplist";
import PlaylistService, { PlaylistIdsSchema } from "../../service/playlist/playlist.service";

const playlistResponseSchema = t.Union([playlistSchema, t.String()]);

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
        async ({ params: { id } }) => {
          const playlist = await PlaylistService.getPlaylist(id);
          return toBplistIfRequested(playlist, id);
        },
        {
          tags: ["Playlist"],
          params: t.Object({
            id: PlaylistIdsSchema,
          }),
          response: playlistResponseSchema,
          detail: {
            description: "Gets a playlist by id",
          },
        }
      )
      .get(
        "/scoresaber-custom-ranked-maps",
        async ({ query: { config }, path }) => {
          const playlist = await PlaylistService.createCustomRankedPlaylist(config);
          return toBplistIfRequested(playlist, path);
        },
        {
          tags: ["Playlist"],
          query: t.Object({
            config: t.String(),
          }),
          response: playlistResponseSchema,
          detail: {
            description: "Create a custom ranked playlist",
          },
        }
      )
      .get(
        "/scoresaber-custom-ranked-maps.bplist",
        async ({ query: { config }, path }) => {
          const playlist = await PlaylistService.createCustomRankedPlaylist(config);
          return toBplistIfRequested(playlist, path);
        },
        {
          tags: ["Playlist"],
          query: t.Object({
            config: t.String(),
          }),
          response: playlistResponseSchema,
          detail: {
            description: "Create a custom ranked playlist (BPLIST)",
          },
        }
      )
      .get(
        "/snipe",
        async ({ query: { user, toSnipe, settings }, path }) => {
          const playlist = await PlaylistService.getSnipePlaylist(user, toSnipe, settings);
          return toBplistIfRequested(playlist, path);
        },
        {
          tags: ["Playlist"],
          query: t.Object({
            user: t.String(),
            toSnipe: t.String(),
            settings: t.Optional(t.String()),
          }),
          response: playlistResponseSchema,
          detail: {
            description: "Create a snipe playlist",
          },
        }
      )
      .get(
        "/snipe.bplist",
        async ({ query: { user, toSnipe, settings }, path }) => {
          const playlist = await PlaylistService.getSnipePlaylist(user, toSnipe, settings);
          return toBplistIfRequested(playlist, path);
        },
        {
          tags: ["Playlist"],
          query: t.Object({
            user: t.String(),
            toSnipe: t.String(),
            settings: t.Optional(t.String()),
          }),
          response: playlistResponseSchema,
          detail: {
            description: "Create a snipe playlist (BPLIST)",
          },
        }
      )
      .get(
        "/self",
        async ({ query: { user, settings }, path }) => {
          const playlist = await PlaylistService.getSelfPlaylist(user, settings);
          return toBplistIfRequested(playlist, path);
        },
        {
          tags: ["Playlist"],
          query: t.Object({
            user: t.String(),
            settings: t.Optional(t.String()),
          }),
          response: playlistResponseSchema,
          detail: {
            description: "Create a self playlist",
          },
        }
      )
      .get(
        "/self.bplist",
        async ({ query: { user, settings }, path }) => {
          const playlist = await PlaylistService.getSelfPlaylist(user, settings);
          return toBplistIfRequested(playlist, path);
        },
        {
          tags: ["Playlist"],
          query: t.Object({
            user: t.String(),
            settings: t.Optional(t.String()),
          }),
          response: playlistResponseSchema,
          detail: {
            description: "Create a self playlist (BPLIST)",
          },
        }
      )
  );
}
