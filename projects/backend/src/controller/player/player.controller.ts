import { DetailTypeSchema } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { PlayerPpsResponseSchema } from "@ssr/common/schemas/response/player/player-pps";
import { PlayerRefreshResponseSchema } from "@ssr/common/schemas/response/player/player-refresh";
import { PlayerScoresChartResponseSchema } from "@ssr/common/schemas/response/player/scores-chart";
import { ScoreSaberScoresPageResponseSchema } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import { Elysia } from "elysia";
import { z } from "zod";
import { ScoreSaberApiService } from "../../service/external/scoresaber-api.service";
import { PlayerStatisticsService } from "../../service/player-statistics/player-statistics.service";
import MiniRankingService from "../../service/player/mini-ranking.service";
import { PlayerCoreService } from "../../service/player/player-core.service";
import { PlayerHistoryService } from "../../service/player/player-history.service";
import { PlayerRankedService } from "../../service/player/player-ranked.service";
import { PlayerScoreHistoryService } from "../../service/player/player-score-history.service";
import { PlayerScoresService } from "../../service/player/player-scores.service";
import { PlayerSearchService } from "../../service/player/player-search.service";
import ScoreSaberPlayerService from "../../service/player/scoresaber-player.service";

export default function playerController(app: Elysia) {
  return app.group("/player", app =>
    app
      .get(
        "/:playerId",
        async ({ params: { playerId }, query: { type } }) => {
          return ScoreSaberPlayerService.getPlayer(playerId, type);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          query: z.object({
            type: z.optional(DetailTypeSchema),
          }),
          detail: {
            description: "Fetch ScoreSaber player profile",
          },
        }
      )
      .get(
        "/scores-chart/:playerId",
        async ({ params: { playerId } }) => {
          return PlayerScoresService.getPlayerScoreChart(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          response: PlayerScoresChartResponseSchema,
          detail: {
            description: "Fetch player score chart data",
          },
        }
      )
      .get(
        "/pps/:playerId",
        async ({ params: { playerId } }) => {
          return PlayerRankedService.getPlayerPps(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          response: PlayerPpsResponseSchema,
          detail: {
            description: "Fetch player PP values",
          },
        }
      )
      .get(
        "/refresh/:playerId",
        async ({ params: { playerId } }) => {
          return PlayerCoreService.refreshPlayer(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          response: PlayerRefreshResponseSchema,
          detail: {
            description: "Refresh player data from ScoreSaber",
          },
        }
      )
      .get(
        "/mini-ranking/:playerId",
        async ({ params: { playerId } }) => {
          return MiniRankingService.getPlayerMiniRankings(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          detail: {
            description: "Fetch player mini-ranking",
          },
        }
      )
      .get(
        "/search",
        async ({ query: { query } }) => {
          const normalizedQuery = query?.trim();
          return {
            players: await PlayerSearchService.searchPlayers(normalizedQuery),
          };
        },
        {
          tags: ["Player"],
          query: z.object({
            // Allow empty string searches (`?query=`) but cap length to avoid unbounded query costs.
            query: z.string().max(64).optional(),
          }),
          detail: {
            description: "Search players",
          },
        }
      )
      .get(
        "/history/:playerId",
        async ({ params: { playerId }, query: { count } }) => {
          const player = await ScoreSaberApiService.lookupPlayer(playerId);
          if (!player) {
            throw new NotFoundError(`Player "${playerId}" not found`);
          }
          const statistics = await PlayerStatisticsService.getStatistics(player);
          return await PlayerHistoryService.getPlayerStatisticHistories(player, statistics, count);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          query: z.object({
            count: z.preprocess(
              v => (v === "" || v === undefined ? 50 : Number(v)),
              z.union([z.literal(-1), z.number().int().min(1)])
            ),
          }),
          detail: {
            description: "Fetch player statistics history",
          },
        }
      )
      .get(
        "/score-history/:playerId/:leaderboardId/:page",
        async ({ params: { playerId, leaderboardId, page } }) => {
          return await PlayerScoreHistoryService.getPlayerScoreHistory(playerId, leaderboardId, page);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
            leaderboardId: z.coerce.number(),
            page: z.coerce.number(),
          }),
          response: ScoreSaberScoresPageResponseSchema,
          detail: {
            description: "Fetch player score history for a leaderboard",
          },
        }
      )
  );
}
