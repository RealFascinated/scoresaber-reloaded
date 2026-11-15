import {
  PlayerRankedBatchScoresResponseSchema,
  PlayerRankedBatchesResponseSchema,
  RankedBatchMarkersResponseSchema,
  RankedBatchPlayersPageResponseSchema,
  RankedBatchResponseSchema,
  RankedBatchesPageResponseSchema,
} from "@ssr/common/schemas/ranked-batch/ranked-batch-responses";
import {
  PlayerRankedBatchScoresParamsSchema,
  PlayerRankedBatchesParamsSchema,
  RankedBatchIdParamsSchema,
  RankedBatchPageQuerySchema,
  RankedBatchPlayersQuerySchema,
} from "@ssr/common/schemas/ranked-batch/ranked-batch-route";
import { Elysia } from "elysia";
import { RankedBatchService } from "../../service/ranked-batch/ranked-batch.service";

export default function rankedBatchController(app: Elysia) {
  return app.group("/ranked-batches", app =>
    app
      .get(
        "/",
        {
          tags: ["Ranked Batches"],
          query: RankedBatchPageQuerySchema,
          response: RankedBatchesPageResponseSchema,
          detail: {
            description: "Fetch a page of ranked batches, newest first",
          },
        },
        async ({ query: { page = 1 } }) => {
          return await RankedBatchService.getRankedBatches(page);
        }
      )
      .get(
        "/markers",
        {
          tags: ["Ranked Batches"],
          response: RankedBatchMarkersResponseSchema,
          detail: {
            description: "Fetch the ranked batch dates used to annotate charts",
          },
        },
        async () => {
          return await RankedBatchService.getMarkers();
        }
      )
      .get(
        "/player/:playerId",
        {
          tags: ["Ranked Batches"],
          params: PlayerRankedBatchesParamsSchema,
          response: PlayerRankedBatchesResponseSchema,
          detail: {
            description: "Fetch the ranked batches that changed a player's pp",
          },
        },
        async ({ params: { playerId } }) => {
          return await RankedBatchService.getPlayerRankedBatches(playerId);
        }
      )
      .get(
        "/player/:playerId/:rankedBatchId/scores",
        {
          tags: ["Ranked Batches"],
          params: PlayerRankedBatchScoresParamsSchema,
          response: PlayerRankedBatchScoresResponseSchema,
          detail: {
            description:
              "Fetch every score of a player that a ranked batch changed, the biggest pp gain first",
          },
        },
        async ({ params: { playerId, rankedBatchId } }) => {
          return await RankedBatchService.getPlayerRankedBatchScores(playerId, rankedBatchId);
        }
      )
      .get(
        "/:rankedBatchId",
        {
          tags: ["Ranked Batches"],
          params: RankedBatchIdParamsSchema,
          response: RankedBatchResponseSchema,
          detail: {
            description: "Fetch a ranked batch and the leaderboards it re-rated",
          },
        },
        async ({ params: { rankedBatchId } }) => {
          return await RankedBatchService.getRankedBatch(rankedBatchId);
        }
      )
      .get(
        "/:rankedBatchId/players",
        {
          tags: ["Ranked Batches"],
          params: RankedBatchIdParamsSchema,
          query: RankedBatchPlayersQuerySchema,
          response: RankedBatchPlayersPageResponseSchema,
          detail: {
            description: "Fetch a page of the players a ranked batch changed the most",
          },
        },
        async ({ params: { rankedBatchId }, query: { page = 1, direction = "gain" } }) => {
          return await RankedBatchService.getRankedBatchPlayers(rankedBatchId, page, direction);
        }
      )
  );
}
