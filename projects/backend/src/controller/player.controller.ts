import { DetailTypeSchema } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { Elysia } from "elysia";
import { z } from "zod";
import MiniRankingService from "../service/mini-ranking.service";
import { PlayerCoreService } from "../service/player/player-core.service";
import { PlayerHistoryService } from "../service/player/player-history.service";
import { PlayerRankedService } from "../service/player/player-ranked.service";
import { PlayerScoreHistoryService } from "../service/player/player-score-history.service";
import { PlayerScoresService } from "../service/player/player-scores.service";
import { PlayerSearchService } from "../service/player/player-search.service";
import { ScoreSaberApiService } from "../service/scoresaber-api.service";
import ScoreSaberService from "../service/scoresaber.service";

export default function playerController(app: Elysia) {
  return app.group("/player", app =>
    app
      .get(
        "/:playerId",
        async ({ params: { playerId }, query: { type } }) => {
          return ScoreSaberService.getPlayer(playerId, type);
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
          return await PlayerHistoryService.getPlayerStatisticHistories(
            player,
            count
          );
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          query: z.object({
            count: z.coerce.number().default(50),
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
          detail: {
            description: "Fetch player score history for a leaderboard",
          },
        }
      )
  );
}
