import { DetailTypeSchema } from "@ssr/common/detail-type";
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
            description: "Fetch a player by their id",
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
            description: "Fetch a player's scores chart data",
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
            description: "Get the pp values for a player's scores",
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
            description: "Refresh a player's for ScoreSaber and update their avatar",
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
            description: "Fetch a player's mini ranking (global and country close rankings)",
          },
        }
      )
      .get(
        "/search",
        async ({ query: { query } }) => {
          return {
            players: PlayerSearchService.searchPlayers(query),
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

          return await PlayerHistoryService.getPlayerStatisticHistories(
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
          return PlayerScoreHistoryService.getPlayerScoreHistory(playerId, leaderboardId, page);
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
