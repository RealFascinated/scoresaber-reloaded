import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import {
  BeatLeaderReplayParamsSchema,
  BeatLeaderScoreStatsParamsSchema,
} from "@ssr/common/schemas/beatleader/beatleader-route";
import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { Elysia, redirect } from "elysia";
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
  );
}
