import { DetailType, DetailTypeSchema } from "@ssr/common/detail-type";
import { getDaysAgoDate } from "@ssr/common/utils/time-utils";
import { Elysia } from "elysia";
import { z } from "zod";
import MiniRankingService from "../service/mini-ranking.service";
import { PlayerCoreService } from "../service/player/player-core.service";
import { PlayerHistoryService } from "../service/player/player-history.service";
import { PlayerRankedService } from "../service/player/player-ranked.service";
import { PlayerScoreHistoryService } from "../service/player/player-score-history.service";
import { PlayerScoresService } from "../service/player/player-scores.service";
import { PlayerSearchService } from "../service/player/player-search.service";
import ScoreSaberService from "../service/scoresaber.service";

export default function playerController(app: Elysia) {
  return app.group("/player", app =>
    app
      .get(
        "/:playerId",
        async ({ params: { playerId }, query: { type } }) => {
          const player = await ScoreSaberService.getPlayer(playerId, type as DetailType, undefined, {
            setMedalsRank: true,
            setInactivesRank: true,
            getHmdBreakdown: true,
          });
          return player;
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
            description: "Fetch a player by their id",
          },
        }
      )
      .get(
        "/pp-boundary/:playerId/:boundaryCount",
        async ({ params: { playerId, boundaryCount } }) => {
          return {
            boundaries: await PlayerRankedService.getPlayerPpBoundary(playerId, boundaryCount),
            boundary: boundaryCount,
          };
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
            boundaryCount: z.coerce.number().max(50).min(1),
          }),
          detail: {
            description: "Fetch the player's pp boundary for a given boundary amount",
          },
        }
      )
      .get(
        "/scores-chart/:playerId",
        async ({ params: { playerId } }) => {
          return await PlayerScoresService.getPlayerScoreChart(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          detail: {
            description: "Fetch a player's scores chart data",
          },
        }
      )
      .get(
        "/pps/:playerId",
        async ({ params: { playerId } }) => {
          return await PlayerRankedService.getPlayerPps(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          detail: {
            description: "Get the pp values for a player's scores",
          },
        }
      )
      .get(
        "/refresh/:playerId",
        async ({ params: { playerId } }) => {
          return await PlayerCoreService.refreshPlayer(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          detail: {
            description: "Refresh a player's for ScoreSaber and update their avatar",
          },
        }
      )
      .get(
        "/mini-ranking/:playerId",
        async ({ params: { playerId } }) => {
          return await MiniRankingService.getPlayerMiniRankings(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          detail: {
            description: "Fetch a player's mini ranking (global and country close rankings)",
          },
        }
      )
      .get(
        "/search",
        async ({ query: { query } }) => {
          return {
            players: await PlayerSearchService.searchPlayers(query),
          };
        },
        {
          tags: ["Player"],
          query: z.object({
            query: z.string().optional(),
          }),
          detail: {
            description: "Search for players",
          },
        }
      )
      .get(
        "/history/:playerId",
        async ({ params: { playerId }, query: { startDate, endDate, includeFields } }) => {
          const player = await ScoreSaberService.getCachedPlayer(playerId, true);
          const projection =
            includeFields && includeFields !== ""
              ? includeFields.split(",").reduce(
                  (acc, field) => {
                    acc[field] = 1;
                    return acc;
                  },
                  {} as Record<string, string | number | boolean | object>
                )
              : undefined;

          return await PlayerHistoryService.getPlayerStatisticHistory(
            player,
            new Date(startDate),
            new Date(endDate),
            projection
          );
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          query: z.object({
            startDate: z.string().default(new Date().toISOString()),
            endDate: z.string().default(getDaysAgoDate(50).toISOString()),
            includeFields: z.string().default("").optional(),
          }),
          detail: {
            description: "Fetch a player's statistics history",
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
            leaderboardId: z.string(),
            page: z.coerce.number(),
          }),
          detail: {
            description: "Fetch a player's score history for a leaderboard",
          },
        }
      )
  );
}
