import {
  PlayerReweightScoresResponseSchema,
  PlayerReweightsResponseSchema,
  ReweightMarkersResponseSchema,
  ReweightPlayersPageResponseSchema,
  ReweightResponseSchema,
  ReweightsPageResponseSchema,
} from "@ssr/common/schemas/reweight/reweight-responses";
import {
  PlayerReweightScoresParamsSchema,
  PlayerReweightsParamsSchema,
  ReweightIdParamsSchema,
  ReweightPageQuerySchema,
  ReweightPlayersQuerySchema,
} from "@ssr/common/schemas/reweight/reweight-route";
import { Elysia } from "elysia";
import { ReweightService } from "../../service/reweight/reweight.service";

export default function reweightController(app: Elysia) {
  return app.group("/reweights", app =>
    app
      .get(
        "/",
        {
          tags: ["Reweights"],
          query: ReweightPageQuerySchema,
          response: ReweightsPageResponseSchema,
          detail: {
            description: "Fetch a page of reweights, newest first",
          },
        },
        async ({ query: { page = 1 } }) => {
          return await ReweightService.getReweights(page);
        }
      )
      .get(
        "/markers",
        {
          tags: ["Reweights"],
          response: ReweightMarkersResponseSchema,
          detail: {
            description: "Fetch the reweight dates used to annotate charts",
          },
        },
        async () => {
          return await ReweightService.getMarkers();
        }
      )
      .get(
        "/player/:playerId",
        {
          tags: ["Reweights"],
          params: PlayerReweightsParamsSchema,
          response: PlayerReweightsResponseSchema,
          detail: {
            description: "Fetch the reweights that changed a player's pp",
          },
        },
        async ({ params: { playerId } }) => {
          return await ReweightService.getPlayerReweights(playerId);
        }
      )
      .get(
        "/player/:playerId/:reweightId/scores",
        {
          tags: ["Reweights"],
          params: PlayerReweightScoresParamsSchema,
          response: PlayerReweightScoresResponseSchema,
          detail: {
            description: "Fetch every score of a player that a reweight changed, the biggest pp gain first",
          },
        },
        async ({ params: { playerId, reweightId } }) => {
          return await ReweightService.getPlayerReweightScores(playerId, reweightId);
        }
      )
      .get(
        "/:reweightId",
        {
          tags: ["Reweights"],
          params: ReweightIdParamsSchema,
          response: ReweightResponseSchema,
          detail: {
            description: "Fetch a reweight and the leaderboards it re-rated",
          },
        },
        async ({ params: { reweightId } }) => {
          return await ReweightService.getReweight(reweightId);
        }
      )
      .get(
        "/:reweightId/players",
        {
          tags: ["Reweights"],
          params: ReweightIdParamsSchema,
          query: ReweightPlayersQuerySchema,
          response: ReweightPlayersPageResponseSchema,
          detail: {
            description: "Fetch a page of the players a reweight changed the most",
          },
        },
        async ({ params: { reweightId }, query: { page = 1, direction = "gain" } }) => {
          return await ReweightService.getReweightPlayers(reweightId, page, direction);
        }
      )
  );
}
