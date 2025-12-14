import { DetailType } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PlayerScoresChartResponse } from "@ssr/common/response/player-scores-chart";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { Elysia, t } from "elysia";
import { PlayerCoreService } from "../service/player/player-core.service";
import { PlayerRankedService } from "../service/player/player-ranked.service";
import { PlayerScoresService } from "../service/player/player-scores.service";
import ScoreSaberService from "../service/scoresaber.service";

export default function playerController(app: Elysia) {
  return app.group("/player", app =>
    app
      .get(
        "/:id",
        async ({ params: { id }, query: { type } }): Promise<ScoreSaberPlayer> => {
          const player = await ScoreSaberService.getPlayer(id, type as DetailType, undefined, {
            setMedalsRank: true,
            setInactivesRank: true,
            getHmdBreakdown: true,
          });
          return player;
        },
        {
          tags: ["Player"],
          params: t.Object({
            id: t.String({ required: true }),
          }),
          query: t.Object({
            type: t.Optional(t.Union([t.Literal("full"), t.Literal("basic")], { default: "basic" })),
          }),
          detail: {
            description: "Fetch a player by their id",
          },
        }
      )
      .get(
        "/pp-boundary/:id/:boundary",
        async ({ params: { id, boundary } }): Promise<PpBoundaryResponse> => {
          return {
            boundaries: await PlayerRankedService.getPlayerPpBoundary(id, boundary),
            boundary: boundary,
          };
        },
        {
          tags: ["Player"],
          params: t.Object({
            id: t.String({ required: true }),
            boundary: t.Number({ maximum: 100, minimum: 1 }),
          }),
          detail: {
            description: "Fetch the player's pp boundary for a given boundary amount",
          },
        }
      )
      .get(
        "/maps-graph/:id",
        async ({ params: { id } }): Promise<PlayerScoresChartResponse> => {
          return await PlayerScoresService.getPlayerScoreChart(id);
        },
        {
          tags: ["Player"],
          params: t.Object({
            id: t.String({ required: true }),
          }),
          detail: {
            description: "Fetch a player's scores chart data",
          },
        }
      )
      .get(
        "/ranked-pps/:id",
        async ({ params: { id } }): Promise<PlayerRankedPpsResponse> => {
          return await PlayerRankedService.getPlayerRankedPps(id);
        },
        {
          tags: ["Player"],
          params: t.Object({
            id: t.String({ required: true }),
          }),
          detail: {
            description: "Fetch a player's ranked pps",
          },
        }
      )
      .get(
        "/refresh/:id",
        async ({ params: { id } }) => {
          return await PlayerCoreService.refreshPlayer(id);
        },
        {
          tags: ["Player"],
          params: t.Object({
            id: t.String({ required: true }),
          }),
          detail: {
            description: "Refresh a player's for ScoreSaber and update their avatar",
          },
        }
      )
  );
}
