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
          return redirect(await PlayerReplayService.getPlayerReplayUrl(scoreId));
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
