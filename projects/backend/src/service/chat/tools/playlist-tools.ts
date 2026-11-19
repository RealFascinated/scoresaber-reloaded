import { env } from "@ssr/common/env";
import {
  CreatePlaylistInputSchema,
  GetRankedBatchPlaylistInputSchema,
  GetRankedMapsPlaylistInputSchema,
  GetSelfPlaylistInputSchema,
  GetSnipePlaylistInputSchema,
  GetSuggestedMapsPlaylistInputSchema,
} from "@ssr/common/schemas/chat/tools/map-tools";
import type { Playlist } from "@ssr/common/schemas/ssr/playlist/playlist";
import { jsonSchema, tool, type ToolSet } from "ai";
import type { Static } from "typebox";
import { ScoreSaberLeaderboardsService } from "../../leaderboard/scoresaber-leaderboards.service";
import PlaylistService from "../../playlist/playlist.service";
import type { ChatToolContext } from "../chat-tool-context";
import { requirePlayerId } from "./map-tool-utils";
import {
  MAX_CREATE_PLAYLIST_SONGS,
  buildPlaylistOutput,
  capPlaylistTitle,
  chunkItems,
  dedupeResolvedMaps,
  describePlaylistMap,
  encodePlaylistSettings,
  playlistModelOutput,
  resolvedMapsToSongs,
  uniquePlaylistMaps,
  type PlaylistToolError,
  type ResolvedPlaylistMap,
  type SkippedMapEntry,
} from "./playlist-tool-utils";

const RESOLVE_CONCURRENCY = 10;

function getRankedMapsPlaylistByKind(kind: "ranked" | "qualified" | "ranking-queue" | "trending") {
  switch (kind) {
    case "ranked":
      return PlaylistService.getRankedMapsPlaylist();
    case "qualified":
      return PlaylistService.getQualifiedMapsPlaylist();
    case "ranking-queue":
      return PlaylistService.getRankingQueueMapsPlaylist();
    case "trending":
      return PlaylistService.getTopTrendingMapsPlaylist();
  }
}

function describeError(error: Error) {
  return error.message.length > 0 ? error.message : "Map not found";
}

async function resolvePlaylistMap(
  map: Static<typeof CreatePlaylistInputSchema>["maps"][number],
  realmId: number
) {
  if ("leaderboardId" in map) {
    const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(map.leaderboardId, realmId);
    const resolved: ResolvedPlaylistMap = {
      songHash: leaderboard.songHash,
      songName: leaderboard.songName,
      levelAuthorName: leaderboard.levelAuthorName,
      difficulty: leaderboard.difficulty.difficulty,
      characteristic: leaderboard.difficulty.characteristic,
    };
    return resolved;
  }

  const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboardByHash(
    map.songHash,
    map.difficulty,
    map.characteristic ?? "Standard",
    realmId
  );
  const resolved: ResolvedPlaylistMap = {
    songHash: leaderboard.songHash,
    songName: leaderboard.songName,
    levelAuthorName: leaderboard.levelAuthorName,
    difficulty: leaderboard.difficulty.difficulty,
    characteristic: leaderboard.difficulty.characteristic,
  };
  return resolved;
}

async function resolvePlaylistMaps(maps: Static<typeof CreatePlaylistInputSchema>["maps"], realmId: number) {
  const skipped: SkippedMapEntry[] = [];
  const resolved: ResolvedPlaylistMap[] = [];

  for (const chunk of chunkItems(maps, RESOLVE_CONCURRENCY)) {
    const results = await Promise.all(
      chunk.map(async map => {
        try {
          return await resolvePlaylistMap(map, realmId);
        } catch (error) {
          skipped.push({
            input: describePlaylistMap(map),
            reason: error instanceof Error ? describeError(error) : "Map not found",
          });
          return undefined;
        }
      })
    );

    for (const result of results) {
      if (result) {
        resolved.push(result);
      }
    }
  }

  return { resolved, skipped };
}

export function createPlaylistTools(context: ChatToolContext) {
  return {
    getSelfPlaylist: tool({
      description:
        "Builds a downloadable .bplist of a player's own scores, with the sort, star range, accuracy range and limit settings. Use when the user asks for a playlist of their own maps.",
      inputSchema: jsonSchema<Static<typeof GetSelfPlaylistInputSchema>>(GetSelfPlaylistInputSchema),
      execute: async ({ playerId, settings }) => {
        const player = requirePlayerId(context, playerId);
        if ("error" in player) {
          return player;
        }
        const playlist = await PlaylistService.getSelfPlaylist(
          player.playerId,
          encodePlaylistSettings(settings)
        );
        return buildPlaylistOutput(playlist);
      },
      toModelOutput: ({ output }) => playlistModelOutput(output),
    }),

    getSnipePlaylist: tool({
      description:
        "Builds a downloadable .bplist of the maps another player has scores on that the sniper can beat. Use when the user asks what to snipe.",
      inputSchema: jsonSchema<Static<typeof GetSnipePlaylistInputSchema>>(GetSnipePlaylistInputSchema),
      execute: async ({ playerId, targetId, settings }) => {
        const player = requirePlayerId(context, playerId);
        if ("error" in player) {
          return player;
        }
        const playlist = await PlaylistService.getSnipePlaylist(
          player.playerId,
          targetId,
          encodePlaylistSettings(settings)
        );
        return buildPlaylistOutput(playlist);
      },
      toModelOutput: ({ output }) => playlistModelOutput(output),
    }),

    getSuggestedMapsPlaylist: tool({
      description:
        "Builds a downloadable .bplist of the maps the suggested maps model recommends for a player, best first. Use when the user wants their suggestions as a playlist.",
      inputSchema: jsonSchema<Static<typeof GetSuggestedMapsPlaylistInputSchema>>(
        GetSuggestedMapsPlaylistInputSchema
      ),
      execute: async ({ playerId, filters }) => {
        const player = requirePlayerId(context, playerId);
        if ("error" in player) {
          return player;
        }
        const playlist = await PlaylistService.getSuggestedMapsPlaylist(player.playerId, filters ?? {});
        return buildPlaylistOutput(playlist);
      },
      toModelOutput: ({ output }) => playlistModelOutput(output),
    }),

    getRankedBatchPlaylist: tool({
      description:
        "Builds a downloadable .bplist of the maps a ranked batch re-rated or newly ranked. Use after getRankedBatches or getRankedBatch when the user wants that batch as a playlist.",
      inputSchema: jsonSchema<Static<typeof GetRankedBatchPlaylistInputSchema>>(
        GetRankedBatchPlaylistInputSchema
      ),
      execute: async ({ rankedBatchId }) => {
        const playlist = await PlaylistService.getRankedBatchPlaylist(rankedBatchId);
        return buildPlaylistOutput(playlist);
      },
      toModelOutput: ({ output }) => playlistModelOutput(output),
    }),

    getRankedMapsPlaylist: tool({
      description:
        "Builds a downloadable .bplist of the site's ranked, qualified, ranking queue or trending maps. Use when the user wants a bulk map playlist rather than individual maps.",
      inputSchema: jsonSchema<Static<typeof GetRankedMapsPlaylistInputSchema>>(
        GetRankedMapsPlaylistInputSchema
      ),
      execute: async ({ kind }) => {
        const playlist = await getRankedMapsPlaylistByKind(kind);
        return buildPlaylistOutput(playlist);
      },
      toModelOutput: ({ output }) => playlistModelOutput(output),
    }),

    createPlaylist: tool({
      description:
        "Builds a custom downloadable .bplist from up to 100 maps the user picked. Each map must be a leaderboardId from resolveMap/searchMaps, or a songHash plus difficulty. Use searchMaps then resolveMap first; unresolved maps are dropped and reported in skipped.",
      inputSchema: jsonSchema<Static<typeof CreatePlaylistInputSchema>>(CreatePlaylistInputSchema),
      execute: async ({ title, description, maps }) => {
        const uniqueMaps = uniquePlaylistMaps(maps, MAX_CREATE_PLAYLIST_SONGS);
        const result = await resolvePlaylistMaps(uniqueMaps, context.realmId);
        const resolved = dedupeResolvedMaps(result.resolved);
        const skipped = result.skipped;

        if (resolved.length === 0) {
          return {
            error:
              "None of the maps could be resolved. Use searchMaps or resolveMap to find valid maps first.",
            ...(skipped.length > 0 ? { skipped } : {}),
          } satisfies PlaylistToolError;
        }

        const playlist = {
          playlistTitle: capPlaylistTitle(title),
          playlistAuthor: env.NEXT_PUBLIC_WEBSITE_NAME,
          songs: resolvedMapsToSongs(resolved),
        } satisfies Playlist;

        return buildPlaylistOutput(playlist, {
          description,
          maxSongs: MAX_CREATE_PLAYLIST_SONGS,
          skipped,
        });
      },
      toModelOutput: ({ output }) => playlistModelOutput(output),
    }),
  } satisfies ToolSet;
}
