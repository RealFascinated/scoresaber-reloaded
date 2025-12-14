import { DetailType, DetailTypeSchema } from "@ssr/common/detail-type";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerRankedPpsResponse } from "@ssr/common/response/player-ranked-pps-response";
import { PlayerScoresChartResponse } from "@ssr/common/response/player-scores-chart";
import { PpBoundaryResponse } from "@ssr/common/response/pp-boundary-response";
import { Elysia } from "elysia";
import { z } from "zod";
import { PlayerCoreService } from "../service/player/player-core.service";
import { PlayerRankedService } from "../service/player/player-ranked.service";
import { PlayerScoresService } from "../service/player/player-scores.service";
import ScoreSaberService from "../service/scoresaber.service";

export default function playerController(app: Elysia) {
  return app.group("/player", app =>
    app
      .get(
        "/:playerId",
        async ({ params: { playerId }, query: { type } }): Promise<ScoreSaberPlayer> => {
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
        async ({ params: { playerId, boundaryCount } }): Promise<PpBoundaryResponse> => {
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
        "/maps-graph/:playerId",
        async ({ params: { playerId } }): Promise<PlayerScoresChartResponse> => {
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
        "/ranked-pps/:playerId",
        async ({ params: { playerId } }): Promise<PlayerRankedPpsResponse> => {
          return await PlayerRankedService.getPlayerRankedPps(playerId);
        },
        {
          tags: ["Player"],
          params: z.object({
            playerId: z.string(),
          }),
          detail: {
            description: "Fetch a player's ranked pps",
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
  );
}
