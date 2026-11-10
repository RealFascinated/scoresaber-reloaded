import { NotFoundError } from "@ssr/common/error/not-found-error";
import { DEFAULT_REALM_ID } from "@ssr/common/realm";
import {
  PlayerHistoryQuerySchema,
  PlayerLeaderboardScoreHistoryParamsSchema,
  PlayerProfileQuerySchema,
  PlayerSearchQuerySchema,
} from "@ssr/common/schemas/player/player-route";
import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
import { PlayerPpsResponseSchema } from "@ssr/common/schemas/response/player/player-pps";
import { PlayerRefreshResponseSchema } from "@ssr/common/schemas/response/player/player-refresh";
import { PlayerScoresChartResponseSchema } from "@ssr/common/schemas/response/player/scores-chart";
import { ScoreSaberScoresPageResponseSchema } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import { PlayerIdParamsSchema } from "@ssr/common/schemas/route/route-params";
import { Elysia } from "elysia";
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
        "/search",
        {
          tags: ["Player"],
          query: PlayerSearchQuerySchema,
          detail: {
            description: "Search players",
          },
        },
        async ({ query: { query } }) => {
          const normalizedQuery = query?.trim();
          return {
            players: await PlayerSearchService.searchPlayers(normalizedQuery),
          };
        }
      )

      .get(
        "/:playerId",
        {
          tags: ["Player"],
          params: PlayerIdParamsSchema,
          query: PlayerProfileQuerySchema,
          detail: {
            description: "Fetch ScoreSaber player profile",
          },
        },
        async ({ params: { playerId }, query: { type, realmId = DEFAULT_REALM_ID } }) => {
          return ScoreSaberPlayerService.getPlayer(playerId, type, undefined, realmId);
        }
      )
      .get(
        "/scores-chart/:playerId",
        {
          tags: ["Player"],
          params: PlayerIdParamsSchema,
          query: RealmQuerySchema,
          response: PlayerScoresChartResponseSchema,
          detail: {
            description: "Fetch player score chart data",
          },
        },
        async ({ params: { playerId }, query: { realmId = DEFAULT_REALM_ID } }) => {
          return PlayerScoresService.getPlayerScoreChart(playerId, realmId);
        }
      )
      .get(
        "/pps/:playerId",
        {
          tags: ["Player"],
          params: PlayerIdParamsSchema,
          query: RealmQuerySchema,
          response: PlayerPpsResponseSchema,
          detail: {
            description: "Fetch player PP values",
          },
        },
        async ({ params: { playerId }, query: { realmId = DEFAULT_REALM_ID } }) => {
          return PlayerRankedService.getPlayerPps(playerId, realmId);
        }
      )
      .get(
        "/refresh/:playerId",
        {
          tags: ["Player"],
          params: PlayerIdParamsSchema,
          response: PlayerRefreshResponseSchema,
          detail: {
            description: "Refresh player data from ScoreSaber",
          },
        },
        async ({ params: { playerId } }) => {
          return PlayerCoreService.refreshPlayer(playerId);
        }
      )
      .get(
        "/mini-ranking/:playerId",
        {
          tags: ["Player"],
          params: PlayerIdParamsSchema,
          query: RealmQuerySchema,
          detail: {
            description: "Fetch player mini-ranking",
          },
        },
        async ({ params: { playerId }, query: { realmId = DEFAULT_REALM_ID } }) => {
          return MiniRankingService.getPlayerMiniRankings(playerId, realmId);
        }
      )
      .get(
        "/history/:playerId",
        {
          tags: ["Player"],
          params: PlayerIdParamsSchema,
          query: PlayerHistoryQuerySchema,
          detail: {
            description: "Fetch player statistics history",
          },
        },
        async ({ params: { playerId }, query: { count, realmId = DEFAULT_REALM_ID } }) => {
          const player = await ScoreSaberApiService.lookupPlayer(playerId, realmId);
          if (!player) {
            throw new NotFoundError(`Player "${playerId}" not found`);
          }
          const statistics = await PlayerStatisticsService.getStatistics(player, realmId);
          // Elysia types transform properties by their raw input; at runtime count was decoded to a number.
          return await PlayerHistoryService.getPlayerStatisticHistories(
            player,
            statistics,
            (count ?? 50) as number,
            realmId
          );
        }
      )
      .get(
        "/score-history/:playerId/:leaderboardId/:page",
        {
          tags: ["Player"],
          params: PlayerLeaderboardScoreHistoryParamsSchema,
          query: RealmQuerySchema,
          response: ScoreSaberScoresPageResponseSchema,
          detail: {
            description: "Fetch player score history for a leaderboard",
          },
        },
        async ({ params: { playerId, leaderboardId, page }, query: { realmId = DEFAULT_REALM_ID } }) => {
          return await PlayerScoreHistoryService.getPlayerScoreHistory(
            playerId,
            leaderboardId,
            page,
            realmId
          );
        }
      )
  );
}
