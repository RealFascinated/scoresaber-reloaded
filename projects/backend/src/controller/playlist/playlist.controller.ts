import { Elysia } from "elysia";
import { z } from "zod";
import PlaylistService from "../../service/playlist/playlist.service";

export default function playlistController(app: Elysia) {
  return app.group("/playlist", app =>
    app
      .get(
        "/scoresaber-ranked-maps.bplist",
        async () => {
          return await PlaylistService.getRankedMapsPlaylist();
        },
        {
          tags: ["Playlist"],
          detail: {
            description: "Gets the ranked maps playlist",
          },
        }
      )
      .get(
        "/scoresaber-qualified-maps.bplist",
        async () => {
          return await PlaylistService.getQualifiedMapsPlaylist();
        },
        {
          tags: ["Playlist"],
          detail: {
            description: "Gets the qualified maps playlist",
          },
        }
      )
      .get(
        "/scoresaber-ranking-queue-maps.bplist",
        async () => {
          return await PlaylistService.getRankingQueueMapsPlaylist();
        },
        {
          tags: ["Playlist"],
          detail: {
            description: "Gets the ranking queue maps playlist",
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
          detail: {
            description: "Create a self playlist",
          },
        }
      )
  );
}
