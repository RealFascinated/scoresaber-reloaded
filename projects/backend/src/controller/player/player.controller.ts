import { DetailTypeSchema } from "@ssr/common/detail-type";
import { NotFoundError } from "@ssr/common/error/not-found-error";
import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
import { PlayerPpsResponseSchema } from "@ssr/common/schemas/response/player/player-pps";
import { PlayerRefreshResponseSchema } from "@ssr/common/schemas/response/player/player-refresh";
import { PlayerScoresChartResponseSchema } from "@ssr/common/schemas/response/player/scores-chart";
import { ScoreSaberScoresPageResponseSchema } from "@ssr/common/schemas/response/score/scoresaber-scores-page";
import { Elysia, t } from "elysia";
import { Type } from "typebox";
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
          query: t.Object({
            // Allow empty string searches (`?query=`) but cap length to avoid unbounded query costs.
            query: t.Optional(t.String({ maxLength: 64 })),
          }),
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
          params: t.Object({
            playerId: t.String(),
          }),
          query: t.Evaluate(
            t.Intersect([
              RealmQuerySchema,
              t.Object({
                type: t.Optional(DetailTypeSchema),
              }),
            ])
          ),
          detail: {
            description: "Fetch ScoreSaber player profile",
          },
        },
        async ({ params: { playerId }, query: { type, realmId } }) => {
          return ScoreSaberPlayerService.getPlayer(playerId, type, undefined, realmId);
        }
      )
      .get(
        "/scores-chart/:playerId",
        {
          tags: ["Player"],
          params: t.Object({
            playerId: t.String(),
          }),
          query: RealmQuerySchema,
          response: PlayerScoresChartResponseSchema,
          detail: {
            description: "Fetch player score chart data",
          },
        },
        async ({ params: { playerId }, query: { realmId } }) => {
          return PlayerScoresService.getPlayerScoreChart(playerId, realmId);
        }
      )
      .get(
        "/pps/:playerId",
        {
          tags: ["Player"],
          params: t.Object({
            playerId: t.String(),
          }),
          query: RealmQuerySchema,
          response: PlayerPpsResponseSchema,
          detail: {
            description: "Fetch player PP values",
          },
        },
        async ({ params: { playerId }, query: { realmId } }) => {
          return PlayerRankedService.getPlayerPps(playerId, realmId);
        }
      )
      .get(
        "/refresh/:playerId",
        {
          tags: ["Player"],
          params: t.Object({
            playerId: t.String(),
          }),
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
          params: t.Object({
            playerId: t.String(),
          }),
          query: RealmQuerySchema,
          detail: {
            description: "Fetch player mini-ranking",
          },
        },
        async ({ params: { playerId }, query: { realmId } }) => {
          return MiniRankingService.getPlayerMiniRankings(playerId, realmId);
        }
      )
      .get(
        "/history/:playerId",
        {
          tags: ["Player"],
          params: t.Object({
            playerId: t.String(),
          }),
          query: t.Evaluate(
            t.Intersect([
              RealmQuerySchema,
              t.Object({
                count: Type.Optional(
                  Type.Codec(
                    Type.Refine(
                      Type.Union([Type.String(), Type.Number(), Type.Undefined()]),
                      v => {
                        const n = v === "" || v === undefined ? 50 : Number(v);
                        return n === -1 || (Number.isInteger(n) && n >= 1);
                      },
                      () => "Expected -1 or an integer >= 1"
                    )
                  )
                    .Decode(v => (v === "" || v === undefined ? 50 : Number(v)))
                    .Encode(v => v)
                ),
              }),
            ])
          ),
          detail: {
            description: "Fetch player statistics history",
          },
        },
        async ({ params: { playerId }, query: { count, realmId } }) => {
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
          params: t.Object({
            playerId: t.String(),
            leaderboardId: t.Integer({ minimum: 1 }),
            page: t.Integer({ minimum: 1 }),
          }),
          query: RealmQuerySchema,
          response: ScoreSaberScoresPageResponseSchema,
          detail: {
            description: "Fetch player score history for a leaderboard",
          },
        },
        async ({ params: { playerId, leaderboardId, page }, query: { realmId } }) => {
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
