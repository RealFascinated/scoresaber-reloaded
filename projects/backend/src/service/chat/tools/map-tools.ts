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
import { tool, type ToolSet } from "ai";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "../../../db";
import { leaderboardRowToType } from "../../../db/converter/scoresaber-leaderboard";
import { beatSaverMapVersionsTable, scoreSaberLeaderboardsTable } from "../../../db/schema";
import { ScoreSaberLeaderboardsRepository } from "../../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberLeaderboardScoresService } from "../../leaderboard/scoresaber-leaderboard-scores.service";
import { ScoreSaberLeaderboardsService } from "../../leaderboard/scoresaber-leaderboards.service";
import { RankedBatchService } from "../../ranked-batch/ranked-batch.service";
import { RealmService } from "../../realm/realm.service";
import { SuggestedMapsService } from "../../suggested-maps/suggested-maps.service";
import type { ChatToolContext } from "../chat-tool-context";
import {
  MAX_RANKED_BATCH_ROWS,
  MAX_TOOL_ROWS,
  getSiteLinkUrl,
  trimLeaderboard,
  trimLeaderboards,
  trimLeaderboardScore,
  trimRankedBatch,
  trimRealm,
  trimSuggestedMap,
} from "./map-tool-utils";
import { resolvePlayerId } from "./player-tool-results";
import { createPlaylistTools } from "./playlist-tools";
import { runTool, toolSchema } from "./tool-runtime";

const MAX_SUGGESTED_MAPS = 100;
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
    .where(eq(beatSaverMapVersionsTable.mapId, key.toLowerCase()))
    .orderBy(desc(beatSaverMapVersionsTable.createdAt))
    .limit(1);
  return row?.hash;
}

async function resolveQueryHash(value: string) {
  if (isSongHash(value)) {
    return { hash: value, matchedBy: "hash" as const };
  }
  if (isBeatSaverKey(value)) {
    const hash = await findVersionHashForKey(value);
    return hash ? { hash, matchedBy: "beatsaverKey" as const } : undefined;
  }
  return undefined;
}

async function findLeaderboardsByHash(hash: string, realmId: number) {
  const normalizedHash = hash.toLowerCase();
  const rows = await ScoreSaberLeaderboardsRepository.selectResolved(realmId)
    .where(eq(sql`lower(${scoreSaberLeaderboardsTable.songHash})`, normalizedHash))
    .orderBy(asc(scoreSaberLeaderboardsTable.difficulty));
  return rows.map(row => leaderboardRowToType(row));
}

function mergeLeaderboards(
  primary: ReturnType<typeof leaderboardRowToType>[],
  secondary: ReturnType<typeof leaderboardRowToType>[]
) {
  const seen = new Set<number>();
  const merged: ReturnType<typeof leaderboardRowToType>[] = [];
  for (const leaderboard of primary.concat(secondary)) {
    if (seen.has(leaderboard.id)) {
      continue;
    }
    seen.add(leaderboard.id);
    merged.push(leaderboard);
  }
  return merged;
}

export function createMapTools(context: ChatToolContext) {
  return {
    ...createPlaylistTools(context),

    getLeaderboard: tool({
      description:
        "Gets one ScoreSaber leaderboard by id: song, mapper, difficulty, stars, ranked state and play count. Get the id from resolveMap or searchMaps first.",
      inputSchema: toolSchema(GetLeaderboardInputSchema),
      execute: ({ leaderboardId }) =>
        runTool(async () => {
          const leaderboard = await ScoreSaberLeaderboardsService.getLeaderboard(
            leaderboardId,
            context.realmId
          );
          return { leaderboard: trimLeaderboard(leaderboard) };
        }, "The leaderboard could not be loaded."),
    }),

    getLeaderboardScores: tool({
      description:
        "Gets a page of the top scores on a ScoreSaber leaderboard: rank, player, accuracy, pp, misses and full combo. Get the leaderboard id from resolveMap or searchMaps first.",
      inputSchema: toolSchema(GetLeaderboardScoresInputSchema),
      execute: ({ leaderboardId, page }) =>
        runTool(async () => {
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
        }, "The leaderboard scores could not be loaded."),
    }),

    searchMaps: tool({
      description:
        "Searches ScoreSaber leaderboards by song or mapper name, star range and ranked/qualified state. Returns leaderboard ids and stars; use it to find maps, then pass selected ids to other tools.",
      inputSchema: toolSchema(SearchMapsInputSchema),
      execute: ({ query, minStars, maxStars, ranked, qualified, category, sort, page }) =>
        runTool(async () => {
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
        }, "The map search failed."),
    }),

    resolveMap: tool({
      description:
        "Resolves a map name, song hash or BeatSaver key to ScoreSaber leaderboard ids with difficulty and stars. ALWAYS use this before any tool that takes a leaderboardId; never guess ids.",
      inputSchema: toolSchema(ResolveMapInputSchema),
      execute: ({ query }) =>
        runTool(async () => {
          const trimmed = query.trim();
          const resolvedHash = await resolveQueryHash(trimmed);
          const hashResults = resolvedHash
            ? await findLeaderboardsByHash(resolvedHash.hash, context.realmId)
            : [];
          const nameResults = isSongHash(trimmed)
            ? []
            : (
                await ScoreSaberLeaderboardsService.getLeaderboardsPaginated(
                  1,
                  { query: trimmed },
                  context.realmId
                )
              ).items;
          const merged = mergeLeaderboards(hashResults, nameResults);
          return {
            query: trimmed,
            matchedBy: resolvedHash?.matchedBy ?? "name",
            results: trimLeaderboards(merged),
            metadata: {
              page: 1,
              totalPages: 1,
              totalItems: merged.length,
              itemsPerPage: merged.length,
            },
          };
        }, "The map could not be resolved."),
    }),

    getBeatSaverMap: tool({
      description:
        "Gets BeatSaver map details by song hash or BeatSaver key: mapper, tags, BPM, duration and every difficulty. Use it when the user asks about the map itself, not its leaderboard.",
      inputSchema: toolSchema(GetBeatSaverMapInputSchema),
      execute: ({ hashOrKey }) =>
        runTool(async () => {
          const value = hashOrKey.trim();
          const resolvedHash = await resolveQueryHash(value);
          if (!resolvedHash) {
            return {
              error: `BeatSaver map "${value}" could not be resolved. Use the 32 or 40 character song hash instead.`,
            };
          }

          const hash = resolvedHash.hash;
          const token = await lookupBeatSaverToken(hash);
          if (!token) {
            return { error: `BeatSaver map "${value}" was not found.` };
          }

          const normalizedHash = hash.toLowerCase();
          const version = token.versions.find(candidate => {
            const candidateHash = candidate.hash.toLowerCase();
            return candidateHash === normalizedHash || candidateHash.startsWith(normalizedHash);
          });
          const base = {
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
          };
          if (!version) {
            return {
              ...base,
              difficulties: [],
              note: `No BeatSaver version matches the requested hash "${hash}", so difficulty details are unavailable.`,
            };
          }
          return {
            ...base,
            versionHash: version.hash,
            difficulties: version.diffs.slice(0, MAX_TOOL_ROWS).map(difficulty => ({
              difficulty: difficulty.difficulty,
              characteristic: difficulty.characteristic,
              nps: difficulty.nps,
              seconds: difficulty.seconds,
              notes: difficulty.notes,
            })),
          };
        }, "The BeatSaver map could not be loaded."),
    }),

    getSuggestedMaps: tool({
      description:
        "Gets the maps the suggested maps model recommends for a player, best first. The order already accounts for gain, how familiar the star range is to the player and maps that pay more pp than their stars suggest, so keep it. Per map: predictedAccuracy is the accuracy the model expects this player to reach, predictedPp is the raw pp of that score, weightedGain is how much the player's total pp would actually rise (after the 0.965 weighting and after replacing their current score on the map), currentAccuracy and currentPp are their existing score on the map (null when unplayed), and familiarity (0 to 1) is how close the map's stars are to what they play now. Compare maps by weightedGain, never by predictedPp. playerRanges is the star, length and density window the maps were filtered to, fitted to the player's recent best scores. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(GetSuggestedMapsInputSchema),
      execute: ({ playerId, limit, ...filters }) =>
        runTool(async () => {
          const player = resolvePlayerId(context, playerId);
          if (!player.ok) {
            return { error: player.error };
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
        }, "The suggested maps could not be loaded."),
    }),

    getRankedBatches: tool({
      description:
        "Lists recent ranked batches (groups of maps whose star ratings changed together), newest first. Use it to find a batch id for getRankedBatch or getRankedBatchPlaylist.",
      inputSchema: toolSchema(GetRankedBatchesInputSchema),
      execute: ({ page }) =>
        runTool(async () => {
          const result = await RankedBatchService.getRankedBatches(page ?? 1);
          return {
            batches: result.items.slice(0, MAX_TOOL_ROWS).map(trimRankedBatch),
            metadata: result.metadata,
          };
        }, "The ranked batches could not be loaded."),
    }),

    getRankedBatch: tool({
      description:
        "Gets one ranked batch by id with the maps it re-rated and the maps that became ranked, including star changes. Get the id from getRankedBatches.",
      inputSchema: toolSchema(GetRankedBatchInputSchema),
      execute: ({ rankedBatchId }) =>
        runTool(async () => {
          const result = await RankedBatchService.getRankedBatch(rankedBatchId);
          return {
            rankedBatch: trimRankedBatch(result.rankedBatch),
            leaderboards: result.leaderboards.slice(0, MAX_RANKED_BATCH_ROWS).map(leaderboard => ({
              leaderboardId: leaderboard.leaderboardId,
              songName: leaderboard.songName,
              songHash: leaderboard.songHash,
              difficulty: leaderboard.difficulty,
              characteristic: leaderboard.characteristic,
              previousStars: leaderboard.previousStars,
              newStars: leaderboard.newStars,
            })),
            newLeaderboards: result.newLeaderboards.slice(0, MAX_RANKED_BATCH_ROWS).map(leaderboard => ({
              leaderboardId: leaderboard.leaderboardId,
              songName: leaderboard.songName,
              songHash: leaderboard.songHash,
              difficulty: leaderboard.difficulty,
              characteristic: leaderboard.characteristic,
              stars: leaderboard.stars,
            })),
          };
        }, "The ranked batch could not be loaded."),
    }),

    getSiteLink: tool({
      description:
        "Builds the site URL for a player, leaderboard or score page. Use it for every link, never write a site URL by hand.",
      inputSchema: toolSchema(GetSiteLinkInputSchema),
      execute: ({ kind, id }) =>
        runTool(async () => ({ url: getSiteLinkUrl(kind, id) }), "The link could not be built."),
    }),

    getRealms: tool({
      description:
        "Lists the ScoreSaber realms (seasons) with their ids, dates and whether they accept scores. Use it to pick a valid realm instead of guessing.",
      inputSchema: toolSchema(GetRealmsInputSchema),
      execute: () =>
        runTool(async () => {
          const realms = await RealmService.getRealms();
          return {
            currentRealmId: context.realmId,
            realms: realms.slice(0, MAX_TOOL_ROWS).map(trimRealm),
          };
        }, "The realms could not be loaded."),
    }),
  } satisfies ToolSet;
}
