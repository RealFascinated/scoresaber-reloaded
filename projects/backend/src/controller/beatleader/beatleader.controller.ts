import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { Elysia, redirect, t } from "elysia";
import BeatLeaderService from "../../service/beatleader/beatleader.service";
import { PlayerReplayService } from "../../service/player/player-replay.service";

const beatLeaderControllerLog = Logger.withTopic("BeatLeader Controller");

export default function beatleaderController(app: Elysia) {
  return app.group("/beatleader", app =>
    app
      .get(
        "/scorestats/:scoreId",
        async ({ params: { scoreId } }): Promise<ScoreStatsResponse> => {
          return BeatLeaderService.getScoresFullScoreStats(scoreId);
        },
        {
          tags: ["BeatLeader"],
          params: t.Object({
            scoreId: t.Number(),
          }),
          detail: {
            description: "Fetch BeatLeader score stats",
          },
        }
      )
      .get(
        "/replay/:scoreId",
        async ({ params: { scoreId } }) => {
          const replayUrl = await PlayerReplayService.getPlayerReplayUrl(scoreId);
          if (!replayUrl) {
            throw new NotFoundError(`Replay not found for score "${scoreId}"`);
          }
          beatLeaderControllerLog.info(`Redirecting to replay URL "${replayUrl}" for score "${scoreId}"`);
          return redirect(replayUrl);
        },
        {
          tags: ["BeatLeader"],
          params: t.Object({
            scoreId: t.String({ pattern: "^\\d+\\.bsor$" }),
          }),
          detail: {
            description: "Redirect to the raw BeatLeader replay file",
          },
        }
      )
  );
}
