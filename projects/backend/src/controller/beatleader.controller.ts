import { NotFoundError } from "@ssr/common/error/not-found-error";
import Logger from "@ssr/common/logger";
import { ScoreStatsResponse } from "@ssr/common/schemas/beatleader/score-stats";
import { Elysia, redirect } from "elysia";
import { z } from "zod";
import BeatLeaderService from "../service/beatleader.service";
import { PlayerReplayService } from "../service/player/player-replay.service";

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
          params: z.object({
            scoreId: z.coerce.number(),
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
          Logger.info(`Redirecting to replay URL "${replayUrl}" for score "${scoreId}"`);
          return redirect(replayUrl);
        },
        {
          tags: ["BeatLeader"],
          params: z.object({
            scoreId: z.string().regex(/^\d+\.bsor$/),
          }),
          detail: {
            description: "Redirect to the raw BeatLeader replay file",
          },
        }
      )
  );
}
