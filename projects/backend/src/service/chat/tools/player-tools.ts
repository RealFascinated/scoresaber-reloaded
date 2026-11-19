import type {
  ChatComparePlayersToolInput,
  ChatGetFollowingToolInput,
  ChatGetMedalsToolInput,
  ChatGetPlayerHistoryToolInput,
  ChatGetPlayerRankingToolInput,
  ChatGetPlayerScoresToolInput,
  ChatGetPlayerToolInput,
  ChatGetScoreHistoryToolInput,
  ChatSearchPlayersToolInput,
} from "@ssr/common/schemas/chat/tools/player-tools";
import {
  ChatComparePlayersToolInputSchema,
  ChatGetFollowingToolInputSchema,
  ChatGetMedalsToolInputSchema,
  ChatGetPlayerHistoryToolInputSchema,
  ChatGetPlayerRankingToolInputSchema,
  ChatGetPlayerScoresToolInputSchema,
  ChatGetPlayerToolInputSchema,
  ChatGetScoreHistoryToolInputSchema,
  ChatSearchPlayersToolInputSchema,
} from "@ssr/common/schemas/chat/tools/player-tools";
import { jsonSchema, tool } from "ai";
import { ScoreSaberApiService } from "../../external/scoresaber-api.service";
import { ScoreSaberLeaderboardsService } from "../../leaderboard/scoresaber-leaderboards.service";
import { PlayerStatisticsService } from "../../player-statistics/player-statistics.service";
import { PlayerHistoryService } from "../../player/player-history.service";
import { PlayerScoreHistoryService } from "../../player/player-score-history.service";
import { PlayerScoresService } from "../../player/player-scores.service";
import { PlayerSearchService } from "../../player/player-search.service";
import ScoreSaberPlayerService from "../../player/scoresaber-player.service";
import { UserFollowsService } from "../../user/user-follows.service";
import type { ChatToolContext } from "../chat-tool-context";
import {
  capRows,
  resolvePlayerId,
  trimPlayerHistoryEntry,
  trimPlayerProfile,
  trimPlayerScore,
  trimPlayerSummary,
} from "./player-tool-results";

async function runTool<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "The player lookup failed." };
  }
}

function playerNotFound(playerId: string) {
  return { error: `Player "${playerId}" was not found. Use searchPlayers to find the right id.` };
}

/**
 * Builds the read-only player tools for a chat turn. Every tool falls back to the signed-in
 * user's linked player when no player id is passed, and realm-aware tools use the user's realm.
 */
export function createPlayerTools(context: ChatToolContext) {
  return {
    searchPlayers: tool({
      description:
        "Search ScoreSaber players by name. Returns up to 25 matches with id, name, country, global rank, country rank and pp. Use this first to turn a player name into a player id for the other player tools.",
      inputSchema: jsonSchema<ChatSearchPlayersToolInput>(ChatSearchPlayersToolInputSchema),
      execute: (input: ChatSearchPlayersToolInput) =>
        runTool(async () => {
          const players = await PlayerSearchService.searchPlayers(input.query);
          return {
            query: input.query,
            count: players.length,
            players: capRows(players.map(trimPlayerSummary)),
          };
        }),
    }),

    getPlayer: tool({
      description:
        "Get one player's profile: global and country rank, pp, medals, average ranked accuracy, ranked and unranked score counts, top play pp, joined and tracked dates, and whether the account is inactive or banned. Defaults to the signed-in user's linked player.",
      inputSchema: jsonSchema<ChatGetPlayerToolInput>(ChatGetPlayerToolInputSchema),
      execute: (input: ChatGetPlayerToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            return { error: resolved.error };
          }
          const player = await ScoreSaberPlayerService.getPlayer(
            resolved.playerId,
            "full",
            undefined,
            context.realmId
          );
          return { player: trimPlayerProfile(player) };
        }),
    }),

    getPlayerScores: tool({
      description:
        "List a player's ScoreSaber scores, highest pp first or newest first. Returns up to 25 trimmed rows with accuracy, pp, score, misses, combo, timestamp and map name, mapper, difficulty, characteristic and stars. Filter by map name or headset with search and hmd. Defaults to the signed-in user's linked player.",
      inputSchema: jsonSchema<ChatGetPlayerScoresToolInput>(ChatGetPlayerScoresToolInputSchema),
      execute: (input: ChatGetPlayerScoresToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            return { error: resolved.error };
          }
          const sort = input.sort ?? "recent";
          const sortField = sort === "top" ? "pp" : "date";
          const page = await PlayerScoresService.getScoreSaberPlayerScores(
            resolved.playerId,
            input.page ?? 1,
            sortField,
            "desc",
            {
              search: input.search,
              hmd: input.hmd,
              realmId: context.realmId,
            }
          );
          return {
            playerId: resolved.playerId,
            sort,
            page: page.metadata.page,
            totalItems: page.metadata.totalItems,
            totalPages: page.metadata.totalPages,
            scores: capRows(page.items.map(trimPlayerScore)),
          };
        }),
    }),

    getPlayerHistory: tool({
      description:
        "Get a player's daily stat history for the last N days, newest first, capped at 25 rows. Each row has date, global rank, country rank, pp, medals, average ranked accuracy and score counts. Use it for progress questions like rank or pp gained this week.",
      inputSchema: jsonSchema<ChatGetPlayerHistoryToolInput>(ChatGetPlayerHistoryToolInputSchema),
      execute: (input: ChatGetPlayerHistoryToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            return { error: resolved.error };
          }
          const player = await ScoreSaberApiService.lookupPlayer(resolved.playerId, context.realmId);
          if (!player) {
            return playerNotFound(resolved.playerId);
          }
          const days = input.days ?? 14;
          const statistics = await PlayerStatisticsService.getStatistics(player, context.realmId);
          const history = await PlayerHistoryService.getPlayerStatisticHistories(
            player,
            statistics,
            days,
            context.realmId
          );
          return {
            playerId: resolved.playerId,
            days,
            history: capRows(
              Object.entries(history).map(([date, entry]) => ({
                date,
                ...trimPlayerHistoryEntry(entry),
              }))
            ),
          };
        }),
    }),

    getPlayerRanking: tool({
      description:
        "List a page of the global ScoreSaber player ranking, optionally filtered by a two-letter country code. Returns up to 25 players with global rank, country rank, pp and medal totals. Use getPlayer for one player's full profile.",
      inputSchema: jsonSchema<ChatGetPlayerRankingToolInput>(ChatGetPlayerRankingToolInputSchema),
      execute: (input: ChatGetPlayerRankingToolInput) =>
        runTool(async () => {
          const page = await PlayerSearchService.getPlayerRanking(input.page ?? 1, {
            country: input.country,
            realmId: context.realmId,
          });
          return {
            country: input.country ?? null,
            page: page.metadata.page,
            totalItems: page.metadata.totalItems,
            totalPages: page.metadata.totalPages,
            players: capRows(page.items.map(trimPlayerSummary)),
          };
        }),
    }),

    getScoreHistory: tool({
      description:
        "Get a player's attempts on one leaderboard, newest first, up to 25 rows. Each row has accuracy, pp, score, misses, combo, timestamp and map details. Requires a leaderboardId from resolveMap; never guess it. Defaults to the signed-in user's linked player.",
      inputSchema: jsonSchema<ChatGetScoreHistoryToolInput>(ChatGetScoreHistoryToolInputSchema),
      execute: (input: ChatGetScoreHistoryToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            return { error: resolved.error };
          }
          const [leaderboard, page] = await Promise.all([
            ScoreSaberLeaderboardsService.getLeaderboard(input.leaderboardId, context.realmId),
            PlayerScoreHistoryService.getPlayerScoreHistory(
              resolved.playerId,
              input.leaderboardId,
              1,
              context.realmId
            ),
          ]);
          return {
            playerId: resolved.playerId,
            leaderboardId: input.leaderboardId,
            page: page.metadata.page,
            totalItems: page.metadata.totalItems,
            totalPages: page.metadata.totalPages,
            scores: capRows(page.items.map(score => trimPlayerScore({ score, leaderboard }))),
          };
        }),
    }),

    comparePlayers: tool({
      description:
        "Compare two players side by side: global rank, country rank, pp, average ranked accuracy, ranked and unranked score counts, medals and top play pp. Takes two player ids; resolve names with searchPlayers first.",
      inputSchema: jsonSchema<ChatComparePlayersToolInput>(ChatComparePlayersToolInputSchema),
      execute: (input: ChatComparePlayersToolInput) =>
        runTool(async () => {
          const [a, b] = await Promise.all([
            ScoreSaberPlayerService.getPlayer(input.a, "full", undefined, context.realmId),
            ScoreSaberPlayerService.getPlayer(input.b, "full", undefined, context.realmId),
          ]);
          return {
            a: trimPlayerProfile(a),
            b: trimPlayerProfile(b),
            ppDifference: a.pp - b.pp,
          };
        }),
    }),

    getFollowing: tool({
      description:
        "List the players the signed-in user follows, up to 25 rows with id, name, country, rank and pp. This always uses the signed-in user's follows and cannot read another user's list.",
      inputSchema: jsonSchema<ChatGetFollowingToolInput>(ChatGetFollowingToolInputSchema),
      execute: () =>
        runTool(async () => {
          const playerIds = capRows(await UserFollowsService.getFollowingIds(context.userId));
          const players = await Promise.allSettled(
            playerIds.map(playerId =>
              ScoreSaberPlayerService.getPlayer(playerId, "basic", undefined, context.realmId)
            )
          );
          return {
            count: playerIds.length,
            players: capRows(
              players.flatMap(result =>
                result.status === "fulfilled" ? [trimPlayerSummary(result.value)] : []
              )
            ),
          };
        }),
    }),

    getMedals: tool({
      description:
        "Get a player's medal summary and their best medal scores. Returns total medals, global and country medal ranks, plus up to 25 medal scores with medal count, accuracy, score, misses, timestamp and map details. Defaults to the signed-in user's linked player.",
      inputSchema: jsonSchema<ChatGetMedalsToolInput>(ChatGetMedalsToolInputSchema),
      execute: (input: ChatGetMedalsToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            return { error: resolved.error };
          }
          const [player, scores] = await Promise.all([
            ScoreSaberPlayerService.getPlayer(resolved.playerId, "basic", undefined, context.realmId),
            PlayerScoresService.getScoreSaberPlayerMedalScores(resolved.playerId, 1, "medals", "desc", {
              realmId: context.realmId,
            }),
          ]);
          const summary = trimPlayerSummary(player);
          return {
            playerId: summary.id,
            name: summary.name,
            medals: summary.medals,
            medalsRank: summary.medalsRank,
            medalsCountryRank: summary.medalsCountryRank,
            medalScoreCount: scores.metadata.totalItems,
            medalScores: capRows(scores.items.map(trimPlayerScore)),
          };
        }),
    }),
  };
}
