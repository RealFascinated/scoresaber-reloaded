import ApiServiceRegistry from "@ssr/common/api-service/api-service-registry";
import {
  GetBeatSaverMapInputSchema,
  GetLeaderboardInputSchema,
  GetLeaderboardScoresInputSchema,
  GetRankedBatchInputSchema,
  GetRankedBatchesInputSchema,
  GetRealmsInputSchema,
  GetSiteLinkInputSchema,
  GetSuggestedMapsInputSchema,
  ResolveMapInputSchema,
  SearchMapsInputSchema,
} from "@ssr/common/schemas/chat/tools/map-tools";
import { jsonSchema, tool, type ToolSet } from "ai";
import { desc, eq } from "drizzle-orm";
import type { Static } from "typebox";
import { db } from "../../../db";
import { beatSaverMapVersionsTable } from "../../../db/schema";
import { ScoreSaberLeaderboardScoresService } from "../../leaderboard/scoresaber-leaderboard-scores.service";
import { ScoreSaberLeaderboardsService } from "../../leaderboard/scoresaber-leaderboards.service";
import { RankedBatchService } from "../../ranked-batch/ranked-batch.service";
import { RealmService } from "../../realm/realm.service";
import { SuggestedMapsService } from "../../suggested-maps/suggested-maps.service";
import type { ChatToolContext } from "../chat-tool-context";
import {
  MAX_TOOL_ROWS,
  getSiteLinkUrl,
  requirePlayerId,
  trimLeaderboard,
  trimLeaderboards,
  trimLeaderboardScore,
  trimRankedBatch,
  trimRealm,
  trimSuggestedMap,
} from "./map-tool-utils";
import { createPlaylistTools } from "./playlist-tools";

const MAX_SUGGESTED_MAPS = 25;
const SONG_HASH_PATTERN = /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{40})$/;
const BEATSAVER_KEY_PATTERN = /^[0-9a-fA-F]{1,8}$/;

function isSongHash(value: string) {
  return SONG_HASH_PATTERN.test(value);
}

function isBeatSaverKey(value: string) {
  return BEATSAVER_KEY_PATTERN.test(value);
}

async function lookupBeatSaverToken(hash: string) {
  const lookup = await ApiServiceRegistry.getInstance().getBeatSaverService().lookupMapResult(hash);
  return lookup.status === "found" ? lookup.map : undefined;
}

async function findVersionHashForKey(key: string) {
  const [row] = await db
    .select({ hash: beatSaverMapVersionsTable.hash })
    .from(beatSaverMapVersionsTable)
    .where(eq(beatSaverMapVersionsTable.mapId, key))
    .orderBy(desc(beatSaverMapVersionsTable.createdAt))
    .limit(1);
  return row?.hash;
}

async function resolveQueryHash(value: string) {
  if (isSongHash(value)) {
    return value;
  }
  if (isBeatSaverKey(value)) {
    return await findVersionHashForKey(value);
  }
  return undefined;
}

async function findLeaderboardsByHash(hash: string, realmId: number) {
  const token = await lookupBeatSaverToken(hash);
  const page = await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(
    1,
    { query: token?.name ?? hash },
    realmId
  );
  const normalizedHash = hash.toLowerCase();
  return {
    items: page.items.filter(leaderboard => leaderboard.songHash.toLowerCase() === normalizedHash),
    metadata: page.metadata,
  };
}

export function createMapTools(context: ChatToolContext) {
  return {
    ...createPlaylistTools(context),

    getLeaderboard: tool({
      description:
        "Gets one ScoreSaber leaderboard by id: song, mapper, difficulty, stars, ranked state and play count. Get the id from resolveMap or searchMaps first.",
      inputSchema: jsonSchema<Static<typeof GetLeaderboardInputSchema>>(GetLeaderboardInputSchema),
      execute: async ({ leaderboardId }) => {
        const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(
          leaderboardId,
          context.realmId
        );
        return { leaderboard: trimLeaderboard(leaderboard) };
      },
    }),

    getLeaderboardScores: tool({
      description:
        "Gets a page of the top scores on a ScoreSaber leaderboard: rank, player, accuracy, pp, misses and full combo. Get the leaderboard id from resolveMap or searchMaps first.",
      inputSchema: jsonSchema<Static<typeof GetLeaderboardScoresInputSchema>>(
        GetLeaderboardScoresInputSchema
      ),
      execute: async ({ leaderboardId, page }) => {
        const response = await ScoreSaberLeaderboardScoresService.getLeaderboardScores(
          leaderboardId,
          page ?? 1,
          undefined,
          context.realmId
        );
        return {
          leaderboard: trimLeaderboard(response.leaderboard),
          scores: response.scores.slice(0, MAX_TOOL_ROWS).map(trimLeaderboardScore),
          beatSaver: response.beatSaver
            ? {
                key: response.beatSaver.id,
                name: response.beatSaver.name,
                mapper: response.beatSaver.author.name,
                bpm: response.beatSaver.metadata.bpm,
                duration: response.beatSaver.metadata.duration,
                nps: response.beatSaver.difficulty.nps,
                seconds: response.beatSaver.difficulty.seconds,
              }
            : undefined,
          metadata: response.metadata,
        };
      },
    }),

    searchMaps: tool({
      description:
        "Searches ScoreSaber leaderboards by song or mapper name, star range and ranked/qualified state. Returns leaderboard ids and stars; use it to find maps, then pass selected ids to other tools.",
      inputSchema: jsonSchema<Static<typeof SearchMapsInputSchema>>(SearchMapsInputSchema),
      execute: async ({ query, minStars, maxStars, ranked, qualified, category, sort, page }) => {
        const result = await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(
          page ?? 1,
          {
            query,
            minStars,
            maxStars,
            ranked,
            qualified,
            category,
            sort,
          },
          context.realmId
        );
        return {
          maps: trimLeaderboards(result.items),
          metadata: result.metadata,
        };
      },
    }),

    resolveMap: tool({
      description:
        "Resolves a map name, song hash or BeatSaver key to ScoreSaber leaderboard ids with difficulty and stars. ALWAYS use this before any tool that takes a leaderboardId; never guess ids.",
      inputSchema: jsonSchema<Static<typeof ResolveMapInputSchema>>(ResolveMapInputSchema),
      execute: async ({ query }) => {
        const trimmed = query.trim();
        const hash = await resolveQueryHash(trimmed);
        if (hash) {
          const result = await findLeaderboardsByHash(hash, context.realmId);
          return {
            query: trimmed,
            matchedBy: isSongHash(trimmed) ? "hash" : "beatsaverKey",
            results: trimLeaderboards(result.items),
            metadata: result.metadata,
          };
        }

        const result = await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(
          1,
          { query: trimmed },
          context.realmId
        );
        return {
          query: trimmed,
          matchedBy: "name",
          results: trimLeaderboards(result.items),
          metadata: result.metadata,
        };
      },
    }),

    getBeatSaverMap: tool({
      description:
        "Gets BeatSaver map details by song hash or BeatSaver key: mapper, tags, BPM, duration and every difficulty. Use it when the user asks about the map itself, not its leaderboard.",
      inputSchema: jsonSchema<Static<typeof GetBeatSaverMapInputSchema>>(GetBeatSaverMapInputSchema),
      execute: async ({ hashOrKey }) => {
        const value = hashOrKey.trim();
        const hash = await resolveQueryHash(value);
        if (!hash) {
          return {
            error: `BeatSaver map "${value}" could not be resolved. Use the 32 or 40 character song hash instead.`,
          };
        }

        const token = await lookupBeatSaverToken(hash);
        if (!token) {
          return { error: `BeatSaver map "${value}" was not found.` };
        }

        const normalizedHash = hash.toLowerCase();
        const version =
          token.versions.find(candidate => candidate.hash.toLowerCase() === normalizedHash) ??
          token.versions[token.versions.length - 1];

        return {
          beatSaverKey: token.id,
          name: token.name,
          mapper: token.uploader.name,
          songName: token.metadata.songName,
          songSubName: token.metadata.songSubName,
          songAuthorName: token.metadata.songAuthorName,
          levelAuthorName: token.metadata.levelAuthorName,
          tags: token.tags.slice(0, MAX_TOOL_ROWS),
          bpm: token.metadata.bpm,
          duration: token.metadata.duration,
          ranked: token.ranked,
          qualified: token.qualified,
          difficulties: (version?.diffs ?? []).slice(0, MAX_TOOL_ROWS).map(difficulty => ({
            difficulty: difficulty.difficulty,
            characteristic: difficulty.characteristic,
            nps: difficulty.nps,
            seconds: difficulty.seconds,
            notes: difficulty.notes,
          })),
        };
      },
    }),

    getSuggestedMaps: tool({
      description:
        "Gets the maps the suggested maps model recommends for a player, best first, with predicted accuracy and pp gain. Defaults to the signed-in user's linked player.",
      inputSchema: jsonSchema<Static<typeof GetSuggestedMapsInputSchema>>(GetSuggestedMapsInputSchema),
      execute: async ({ playerId, limit, ...filters }) => {
        const player = requirePlayerId(context, playerId);
        if ("error" in player) {
          return player;
        }
        const response = await SuggestedMapsService.getSuggestedMaps({
          ...filters,
          playerId: player.playerId,
          limit: Math.min(limit ?? MAX_SUGGESTED_MAPS, MAX_SUGGESTED_MAPS),
        });
        return {
          playerSkill: response.playerSkill,
          playerRanges: response.playerRanges,
          updatedAt: response.updatedAt,
          maps: response.maps.slice(0, MAX_SUGGESTED_MAPS).map(trimSuggestedMap),
        };
      },
    }),

    getRankedBatches: tool({
      description:
        "Lists recent ranked batches (groups of maps whose star ratings changed together), newest first. Use it to find a batch id for getRankedBatch or getRankedBatchPlaylist.",
      inputSchema: jsonSchema<Static<typeof GetRankedBatchesInputSchema>>(GetRankedBatchesInputSchema),
      execute: async ({ page }) => {
        const result = await RankedBatchService.getRankedBatches(page ?? 1);
        return {
          batches: result.items.slice(0, MAX_TOOL_ROWS).map(trimRankedBatch),
          metadata: result.metadata,
        };
      },
    }),

    getRankedBatch: tool({
      description:
        "Gets one ranked batch by id with the maps it re-rated and the maps that became ranked, including star changes. Get the id from getRankedBatches.",
      inputSchema: jsonSchema<Static<typeof GetRankedBatchInputSchema>>(GetRankedBatchInputSchema),
      execute: async ({ rankedBatchId }) => {
        const result = await RankedBatchService.getRankedBatch(rankedBatchId);
        return {
          rankedBatch: trimRankedBatch(result.rankedBatch),
          leaderboards: result.leaderboards.slice(0, MAX_TOOL_ROWS).map(leaderboard => ({
            leaderboardId: leaderboard.leaderboardId,
            songName: leaderboard.songName,
            songHash: leaderboard.songHash,
            difficulty: leaderboard.difficulty,
            characteristic: leaderboard.characteristic,
            previousStars: leaderboard.previousStars,
            newStars: leaderboard.newStars,
          })),
          newLeaderboards: result.newLeaderboards.slice(0, MAX_TOOL_ROWS).map(leaderboard => ({
            leaderboardId: leaderboard.leaderboardId,
            songName: leaderboard.songName,
            songHash: leaderboard.songHash,
            difficulty: leaderboard.difficulty,
            characteristic: leaderboard.characteristic,
            stars: leaderboard.stars,
          })),
        };
      },
    }),

    getSiteLink: tool({
      description:
        "Builds the site URL for a player, leaderboard or score page. Use it for every link, never write a site URL by hand.",
      inputSchema: jsonSchema<Static<typeof GetSiteLinkInputSchema>>(GetSiteLinkInputSchema),
      execute: async ({ kind, id }) => ({ url: getSiteLinkUrl(kind, id) }),
    }),

    getRealms: tool({
      description:
        "Lists the ScoreSaber realms (seasons) with their ids, dates and whether they accept scores. Use it to pick a valid realm instead of guessing.",
      inputSchema: jsonSchema<Static<typeof GetRealmsInputSchema>>(GetRealmsInputSchema),
      execute: async () => {
        const realms = await RealmService.getRealms();
        return {
          currentRealmId: context.realmId,
          realms: realms.slice(0, MAX_TOOL_ROWS).map(trimRealm),
        };
      },
    }),
  } satisfies ToolSet;
}
