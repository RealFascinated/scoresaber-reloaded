import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import {
  BeatLeaderOverlayDataParamsSchema,
  BeatLeaderOverlayPlayerParamsSchema,
  BeatLeaderOverlayRatingsParamsSchema,
  BeatLeaderPlayerOverlayDataParamsSchema,
  BeatLeaderReplayParamsSchema,
  BeatLeaderScoreStatsParamsSchema,
} from "@ssr/common/schemas/beatleader/beatleader-route";
import { BeatLeaderOverlayDataResponseSchema } from "@ssr/common/schemas/response/beatleader/overlay-data";
import {
  BeatLeaderOverlayPlayerResponseSchema,
  BeatLeaderOverlayRatingsResponseSchema,
} from "@ssr/common/schemas/response/beatleader/overlay-ratings";
import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { Elysia, redirect } from "elysia";
import { BeatLeaderOverlayDataService } from "../../service/beatleader/beatleader-overlay-data.service";
import { BeatLeaderOverlayLiveService } from "../../service/beatleader/beatleader-overlay-live.service";
import BeatLeaderService from "../../service/beatleader/beatleader.service";
import { PlayerReplayService } from "../../service/player/player-replay.service";

const beatLeaderControllerLog = Logger.withTopic("BeatLeader Controller");

export default function beatleaderController(app: Elysia) {
  return app.group("/beatleader", app =>
    app
      .get(
        "/scorestats/:scoreId",
        {
          tags: ["BeatLeader"],
          params: BeatLeaderScoreStatsParamsSchema,
          detail: {
            description: "Fetch BeatLeader score stats",
          },
        },
        async ({ params: { scoreId } }): Promise<ScoreStatsResponse> => {
          return BeatLeaderService.getScoresFullScoreStats(scoreId);
        }
      )
      .get(
        "/replay/:scoreId",
        {
          tags: ["BeatLeader"],
          params: BeatLeaderReplayParamsSchema,
          detail: {
            description: "Redirect to the raw BeatLeader replay file",
          },
        },
        async ({ params: { scoreId } }) => {
          const replayUrl = await PlayerReplayService.getPlayerReplayUrl(scoreId);
          if (!replayUrl) {
            throw new NotFoundError(`Replay not found for score "${scoreId}"`);
          }
          beatLeaderControllerLog.info(`Redirecting to replay URL "${replayUrl}" for score "${scoreId}"`);
          return redirect(replayUrl);
        }
      )
      .get(
        "/overlay-data/:scoreId",
        {
          tags: ["BeatLeader"],
          params: BeatLeaderOverlayDataParamsSchema,
          response: BeatLeaderOverlayDataResponseSchema,
          detail: {
            description:
              "Fetch the data the overlay needs from a BeatLeader score (accuracy for each second)",
          },
        },
        async ({ params: { scoreId }, set }) => {
          set.headers["cache-control"] = "public, max-age=31536000, immutable";
          return BeatLeaderOverlayDataService.getByScoreId(scoreId);
        }
      )
      .get(
        "/overlay-data/ratings/:hash/:difficulty/:characteristic",
        {
          tags: ["BeatLeader"],
          params: BeatLeaderOverlayRatingsParamsSchema,
          response: BeatLeaderOverlayRatingsResponseSchema,
          detail: {
            description: "Fetch the BeatLeader ratings of a difficulty, which the overlay turns into live pp",
          },
        },
        async ({ params: { hash, difficulty, characteristic }, set }) => {
          set.headers["cache-control"] = "public, max-age=300";
          return BeatLeaderOverlayLiveService.getRatings(hash, difficulty, characteristic);
        }
      )
      .get(
        "/overlay-data/player/:playerId",
        {
          tags: ["BeatLeader"],
          params: BeatLeaderOverlayPlayerParamsSchema,
          response: BeatLeaderOverlayPlayerResponseSchema,
          detail: {
            description: "Fetch the BeatLeader pp and ranks of a player for the overlay",
          },
        },
        async ({ params: { playerId }, set }) => {
          set.headers["cache-control"] = "public, max-age=30";
          return BeatLeaderOverlayLiveService.getPlayer(playerId);
        }
      )
      .get(
        "/overlay-data/player/:playerId/:hash/:difficulty/:characteristic",
        {
          tags: ["BeatLeader"],
          params: BeatLeaderPlayerOverlayDataParamsSchema,
          response: BeatLeaderOverlayDataResponseSchema,
          detail: {
            description: "Fetch the overlay data of the best BeatLeader score of a player on a map",
          },
        },
        async ({ params: { playerId, hash, difficulty, characteristic }, set }) => {
          // The best score can change when the player sets a new one
          set.headers["cache-control"] = "public, max-age=60";
          return BeatLeaderOverlayDataService.getByPlayerAndMap(playerId, hash, difficulty, characteristic);
        }
      )
  );
}
