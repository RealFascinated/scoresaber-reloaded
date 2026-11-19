import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type {
  ChatComparePlayersToolInput,
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
import { tool } from "ai";
import { ScoreSaberAccountsRepository } from "../../../repositories/scoresaber-accounts.repository";
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
  MAX_TOOL_ROWS,
  capRows,
  resolvePlayerId,
  trimPlayerHistoryEntry,
  trimPlayerProfile,
  trimPlayerScore,
  trimPlayerSummary,
} from "./player-tool-results";
import { runTool, toolSchema } from "./tool-runtime";

async function searchPlayerCandidates(query: string) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length <= 3) {
    return [];
  }

  const pattern = `%${normalizedQuery.replace(/[%_\\]/g, "\\$&")}%`;
  const [scoreSaberResponse, localMatches] = await Promise.all([
    ScoreSaberApiService.searchPlayers(normalizedQuery),
    ScoreSaberAccountsRepository.searchIdsByNameIlike(pattern, MAX_TOOL_ROWS),
  ]);
  const tokens = scoreSaberResponse?.data ?? [];
  const tokenById = new Map(tokens.map(token => [token.id, token]));
  const candidateIds = [
    ...new Set(localMatches.map(match => match.id).concat(tokens.map(token => token.id))),
  ].slice(0, MAX_TOOL_ROWS);
  const players = await Promise.all(
    candidateIds.map(playerId =>
      ScoreSaberPlayerService.getPlayer(playerId, "basic", tokenById.get(playerId), DEFAULT_REALM_ID)
    )
  );
  return players.sort((a, b) => {
    if (a.inactive && !b.inactive) {
      return 1;
    }
    if (!a.inactive && b.inactive) {
      return -1;
    }
    return a.rank - b.rank;
  });
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
      inputSchema: toolSchema(ChatSearchPlayersToolInputSchema),
      execute: (input: ChatSearchPlayersToolInput) =>
        runTool(async () => {
          const players = await searchPlayerCandidates(input.query);
          return {
            query: input.query,
            count: players.length,
            players: capRows(players.map(trimPlayerSummary)),
          };
        }, "The player search failed."),
    }),

    getPlayer: tool({
      description:
        "Get one player's profile: global and country rank, pp, medals, average ranked accuracy, ranked and unranked score counts, top play pp, joined and tracked dates, and whether the account is inactive or banned. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetPlayerToolInputSchema),
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
      inputSchema: toolSchema(ChatGetPlayerScoresToolInputSchema),
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
        "Get a player's daily stat history for the last N days, newest first, capped at 25 rows. Each row has date, global rank, country rank, pp, medals, average ranked accuracy and score counts. The days field reports how many rows were actually returned. Use it for progress questions like rank or pp gained this week.",
      inputSchema: toolSchema(ChatGetPlayerHistoryToolInputSchema),
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
          const rows = capRows(
            Object.entries(history).map(([date, entry]) => ({
              date,
              ...trimPlayerHistoryEntry(entry),
            }))
          );
          return {
            playerId: resolved.playerId,
            days: rows.length,
            history: rows,
          };
        }),
    }),

    getPlayerRanking: tool({
      description:
        "List a page of the global ScoreSaber player ranking, optionally filtered by a two-letter country code. Returns up to 25 players with global rank, country rank, pp and medal totals. Use getPlayer for one player's full profile.",
      inputSchema: toolSchema(ChatGetPlayerRankingToolInputSchema),
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
      inputSchema: toolSchema(ChatGetScoreHistoryToolInputSchema),
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
      inputSchema: toolSchema(ChatComparePlayersToolInputSchema),
      execute: (input: ChatComparePlayersToolInput) =>
        runTool(async () => {
          const aId = input.a.trim();
          const bId = input.b.trim();
          if (aId === bId) {
            return {
              error: "Both player ids refer to the same player. Pass two different players to compare.",
            };
          }
          const [a, b] = await Promise.all([
            ScoreSaberPlayerService.getPlayer(aId, "full", undefined, context.realmId),
            ScoreSaberPlayerService.getPlayer(bId, "full", undefined, context.realmId),
          ]);
          if (a.id === b.id) {
            return {
              error: "Both player ids refer to the same player. Pass two different players to compare.",
            };
          }
          return {
            a: trimPlayerProfile(a),
            b: trimPlayerProfile(b),
            ppDifference: Math.round((a.pp - b.pp) * 100) / 100,
          };
        }, "The player comparison failed."),
    }),

    getFollowing: tool({
      description:
        "List the players the signed-in user follows, up to 25 rows with id, name, country, rank and pp. count is the total number of followed players and skipped is how many could not be looked up. This always uses the signed-in user's follows and cannot read another user's list.",
      inputSchema: toolSchema(ChatGetFollowingToolInputSchema),
      execute: () =>
        runTool(async () => {
          const playerIds = await UserFollowsService.getFollowingIds(context.userId);
          const results = await Promise.allSettled(
            playerIds.map(playerId =>
              ScoreSaberPlayerService.getPlayer(playerId, "basic", undefined, context.realmId)
            )
          );
          const players = results.flatMap(result =>
            result.status === "fulfilled" ? [trimPlayerSummary(result.value)] : []
          );
          const skipped = results.filter(result => result.status === "rejected").length;
          return {
            count: playerIds.length,
            skipped,
            players: capRows(players),
          };
        }, "The following list could not be loaded."),
    }),

    getMedals: tool({
      description:
        "Get a player's medal summary and their best medal scores. Returns total medals, global and country medal ranks, plus up to 25 medal scores with medal count, accuracy, score, misses, timestamp and map details. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetMedalsToolInputSchema),
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
