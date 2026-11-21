import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import type {
  ChatCalculatePpToolInput,
  ChatComparePlayersToolInput,
  ChatGetMedalsToolInput,
  ChatGetPlayerHistoryToolInput,
  ChatGetPlayerPerformanceToolInput,
  ChatGetPlayerRankingToolInput,
  ChatGetImprovableScoresToolInput,
  ChatGetPlayerScoresToolInput,
  ChatGetPlayerToolInput,
  ChatGetScoreHistoryToolInput,
  ChatSearchPlayersToolInput,
} from "@ssr/common/schemas/chat/tools/player-tools";
import {
  ChatCalculatePpToolInputSchema,
  ChatComparePlayersToolInputSchema,
  ChatGetFollowingToolInputSchema,
  ChatGetImprovableScoresToolInputSchema,
  ChatGetMedalsToolInputSchema,
  ChatGetPlayerHistoryToolInputSchema,
  ChatGetPlayerPerformanceToolInputSchema,
  ChatGetPlayerRankingToolInputSchema,
  ChatGetPlayerScoresToolInputSchema,
  ChatGetPlayerToolInputSchema,
  ChatGetScoreHistoryToolInputSchema,
  ChatSearchPlayersToolInputSchema,
} from "@ssr/common/schemas/chat/tools/player-tools";
import { tool } from "ai";
import { inArray } from "drizzle-orm";
import { leaderboardRowToType } from "../../../db/converter/scoresaber-leaderboard";
import { scoreSaberLeaderboardsTable } from "../../../db/schema";
import { ScoreSaberAccountsRepository } from "../../../repositories/scoresaber-accounts.repository";
import { ScoreSaberLeaderboardsRepository } from "../../../repositories/scoresaber-leaderboards.repository";
import { ScoreSaberApiService } from "../../external/scoresaber-api.service";
import { ScoreSaberLeaderboardsService } from "../../leaderboard/scoresaber-leaderboards.service";
import { PlayerStatisticsService } from "../../player-statistics/player-statistics.service";
import { PlayerHistoryService } from "../../player/player-history.service";
import { PlayerScoreHistoryService } from "../../player/player-score-history.service";
import { PlayerScoresService } from "../../player/player-scores.service";
import { PlayerSearchService } from "../../player/player-search.service";
import ScoreSaberPlayerService from "../../player/scoresaber-player.service";
import { listPlayerRankedScores } from "../../suggested-maps/suggested-maps-data";
import { UserFollowsService } from "../../user/user-follows.service";
import type { ChatToolContext } from "../chat-tool-context";
import { buildImprovableScores } from "./improvable-scores";
import { buildPlayerPerformance, calculatePpRows } from "./player-performance";
import {
  MAX_TOOL_ROWS,
  capRows,
  resolvePlayerId,
  trimPlayerHistoryEntry,
  trimPlayerProfile,
  trimPlayerScore,
  summarizeHistoryChange,
  trimPlayerSummary,
} from "./player-tool-results";
import { ChatToolError, runTool, toolSchema } from "./tool-runtime";

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
  if (!scoreSaberResponse.ok) {
    throw new ChatToolError(
      "unavailable",
      scoreSaberResponse.message,
      "This may be temporary: retry once, and if it fails again tell the user instead of retrying further."
    );
  }
  const tokens = scoreSaberResponse.response.data;
  const tokenById = new Map(tokens.map(token => [token.id, token]));
  const candidateIds = [
    ...new Set(localMatches.map(match => match.id).concat(tokens.map(token => token.id))),
  ].slice(0, MAX_TOOL_ROWS);
  const players = await Promise.all(
    candidateIds.map(playerId =>
      ScoreSaberPlayerService.getPlayer(playerId, "basic", tokenById.get(playerId), DEFAULT_REALM_ID)
    )
  );
  return players
    .filter(player => !player.banned)
    .sort((a, b) => {
      if (a.inactive && !b.inactive) {
        return 1;
      }
      if (!a.inactive && b.inactive) {
        return -1;
      }
      return a.rank - b.rank;
    });
}

async function assertNotBanned(playerId: string) {
  const account = await ScoreSaberAccountsRepository.findRowById(playerId);
  if (account?.banned) {
    throw new ChatToolError(
      "not_found",
      `${account.name} is banned, so they have no ranking or pp data.`,
      "Tell the user the player is banned instead of analysing their scores."
    );
  }
}

function playerNotFound(playerId: string) {
  return new ChatToolError(
    "not_found",
    `Player "${playerId}" was not found.`,
    "Use searchPlayers to find the right id."
  );
}

/**
 * Builds the read-only player tools for a chat turn. Every tool falls back to the signed-in
 * user's linked player when no player id is passed, and realm-aware tools use the user's realm.
 */
export function createPlayerTools(context: ChatToolContext) {
  return {
    searchPlayers: tool({
      description:
        "Search ScoreSaber players by name. Returns up to 100 matches with id, name, country, global rank, country rank and pp. Use this first to turn a player name into a player id for the other player tools.",
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
            throw new ChatToolError(resolved.code, resolved.error);
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
        "List a player's ScoreSaber scores, highest pp first or newest first. Returns 8 rows per page (use page for more) with accuracy, pp, score, misses, combo, timestamp and map name, mapper, difficulty, characteristic and stars. Filter by map name or headset with search and hmd. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetPlayerScoresToolInputSchema),
      execute: (input: ChatGetPlayerScoresToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            throw new ChatToolError(resolved.code, resolved.error);
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

    getPlayerPerformance: tool({
      description:
        "Get how a player performs by star rating, computed from all of their ranked scores: per whole-star bucket the score count, average, median and best accuracy, best pp, full combo rate, how many of their top 50 plays are in that bucket (inTop50), weightedPp (how much of their total pp that bucket contributes, the best measure of where their pp comes from), and the same accuracy for the last 60 days. Also returns their weighted pp total, the pp of their #1, #10, #25, #50 and #100 scores, and rawPpForOneWeightedPp (the raw pp a new score needs to add 1 weighted pp). Use it for any question about where a player is strong or weak, where to gain pp, which star range to play, what to improve, or how their accuracy changes with difficulty, instead of inferring it from a handful of scores. For where a player is strongest or where their pp comes from, use weightedPp and inTop50, not accuracy, since accuracy always falls as stars rise. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetPlayerPerformanceToolInputSchema),
      execute: (input: ChatGetPlayerPerformanceToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            throw new ChatToolError(resolved.code, resolved.error);
          }
          await assertNotBanned(resolved.playerId);
          const scores = await listPlayerRankedScores(resolved.playerId, context.realmId);
          if (scores.length === 0) {
            throw new ChatToolError("not_found", "This player has no ranked scores in this realm.");
          }
          return {
            playerId: resolved.playerId,
            ...buildPlayerPerformance(scores, new Date()),
          };
        }, "The player performance could not be loaded."),
    }),

    getImprovableScores: tool({
      description:
        "Find which of a player's existing scores are worth improving for pp. Evaluates their best scores and returns, for each, the map, stars, current accuracy and pp, whether it was a full combo, the player's best accuracy on maps of similar stars (bestAccuracyAtSimilarStars, a realistic ceiling), and the raw pp and weightedGain (the real increase in total pp) at small accuracy increases and at that best similar accuracy (gainAtBestSimilarAccuracy, the realistic target, null when the score already beats it). Every target also has a tier (reachable, stretch, elite, unrealistic) and a rarity among all ranked scores. Sorted by the realistic gain. Use it for any question about which scores to improve or replay instead of calling calculatePp per map, and recommend the realistic target before any bigger jump. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetImprovableScoresToolInputSchema),
      execute: (input: ChatGetImprovableScoresToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            throw new ChatToolError(resolved.code, resolved.error);
          }
          await assertNotBanned(resolved.playerId);
          const scores = await listPlayerRankedScores(resolved.playerId, context.realmId);
          if (scores.length === 0) {
            throw new ChatToolError("not_found", "This player has no ranked scores in this realm.");
          }
          const improvable = buildImprovableScores(scores, {
            limit: input.limit,
            increases: input.increases,
          });
          const rows = await ScoreSaberLeaderboardsRepository.selectResolved(context.realmId).where(
            inArray(
              scoreSaberLeaderboardsTable.id,
              improvable.map(score => score.leaderboardId)
            )
          );
          const leaderboards = new Map(
            rows.map(row => {
              const leaderboard = leaderboardRowToType(row);
              return [leaderboard.id, leaderboard] as const;
            })
          );
          return {
            playerId: resolved.playerId,
            scores: improvable.map(score => {
              const leaderboard = leaderboards.get(score.leaderboardId);
              return {
                ...score,
                mapName: leaderboard?.songName,
                difficulty: leaderboard?.difficulty.difficulty,
              };
            }),
          };
        }, "The improvable scores could not be loaded."),
    }),

    calculatePp: tool({
      description:
        "Calculate the raw ScoreSaber pp a score at the given accuracies would earn on a map of the given star rating, and the weighted pp it would add to the player's total (weightedGain, null when no player is linked or given), accounting for the 0.965 weighting and, when leaderboardId is given, for replacing the player's existing score on that map. Use it for any what-if question such as what 98% would give or how much an improvement is worth. Every accuracy row has a tier and rarity, so also use it to judge whether the accuracy is realistic. Never estimate pp yourself. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatCalculatePpToolInputSchema),
      execute: (input: ChatCalculatePpToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          let pps: number[] | null = null;
          let currentPp: number | null = null;
          if (resolved.ok) {
            const scores = await listPlayerRankedScores(resolved.playerId, context.realmId);
            pps = scores.map(score => score.pp);
            if (input.leaderboardId !== undefined) {
              const existing = scores.find(score => score.leaderboardId === input.leaderboardId);
              currentPp = existing?.pp ?? null;
            }
          }
          return {
            stars: input.stars,
            currentPp,
            rows: calculatePpRows({
              stars: input.stars,
              accuracies: input.accuracies,
              pps,
              currentPp,
            }),
          };
        }, "The pp calculation failed."),
    }),

    getPlayerHistory: tool({
      description:
        "Get a player's daily stat history for the last N days, newest first, capped at 100 rows. Each row has date, global rank, country rank, pp, medals, average ranked accuracy and score counts. The days field reports how many rows were actually returned, and change gives the difference from the oldest to the newest row (from and to dates, pp, rank, country rank, medals, ranked scores; a negative rank change means the player moved up). Quote change instead of subtracting rows. Use it for progress questions like rank or pp gained this week, and give the exact dates the rows cover.",
      inputSchema: toolSchema(ChatGetPlayerHistoryToolInputSchema),
      execute: (input: ChatGetPlayerHistoryToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            throw new ChatToolError(resolved.code, resolved.error);
          }
          const playerResult = await ScoreSaberApiService.lookupPlayer(resolved.playerId, context.realmId);
          if (!playerResult.ok) {
            if (playerResult.error === "not_found") {
              throw playerNotFound(resolved.playerId);
            }
            throw new ChatToolError(
              "unavailable",
              playerResult.message,
              "This may be temporary: retry once, and if it fails again tell the user instead of retrying further."
            );
          }
          const player = playerResult.response;
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
            change: summarizeHistoryChange(rows),
            history: rows,
          };
        }),
    }),

    getPlayerRanking: tool({
      description:
        "List a page of the global ScoreSaber player ranking, optionally filtered by a two-letter country code. Returns up to 100 players with global rank, country rank, pp and medal totals. Use getPlayer for one player's full profile.",
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
        "Get a player's attempts on one leaderboard, newest first, up to 100 rows. Each row has accuracy, pp, score, misses, combo, timestamp and map details. Requires a leaderboardId from resolveMap; never guess it. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetScoreHistoryToolInputSchema),
      execute: (input: ChatGetScoreHistoryToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            throw new ChatToolError(resolved.code, resolved.error);
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
            throw new ChatToolError(
              "invalid_input",
              "Both player ids refer to the same player.",
              "Pass two different players to compare."
            );
          }
          const [a, b] = await Promise.all([
            ScoreSaberPlayerService.getPlayer(aId, "full", undefined, context.realmId),
            ScoreSaberPlayerService.getPlayer(bId, "full", undefined, context.realmId),
          ]);
          if (a.id === b.id) {
            throw new ChatToolError(
              "invalid_input",
              "Both player ids refer to the same player.",
              "Pass two different players to compare."
            );
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
        "List the players the signed-in user follows, up to 100 rows with id, name, country, rank and pp. count is the total number of followed players and skipped is how many could not be looked up. This always uses the signed-in user's follows and cannot read another user's list.",
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
        "Get a player's medal summary and their best medal scores. Returns total medals, global and country medal ranks, plus up to 100 medal scores with medal count, accuracy, score, misses, timestamp and map details. Defaults to the signed-in user's linked player.",
      inputSchema: toolSchema(ChatGetMedalsToolInputSchema),
      execute: (input: ChatGetMedalsToolInput) =>
        runTool(async () => {
          const resolved = resolvePlayerId(context, input.playerId);
          if (!resolved.ok) {
            throw new ChatToolError(resolved.code, resolved.error);
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
