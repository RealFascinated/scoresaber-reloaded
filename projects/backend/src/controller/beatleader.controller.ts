import { Elysia, redirect, t } from "elysia";
import BeatLeaderService from "../service/beatleader.service";
import { PlayerReplayService } from "../service/player/player-replay.service";

export default function beatleaderController(app: Elysia) {
  return app.group("/beatleader", app =>
    app
      .get(
        "/scorestats/:id",
        async ({ params: { id } }) => {
          return await BeatLeaderService.getScoresFullScoreStats(id);
        },
        {
          tags: ["BeatLeader"],
          params: t.Object({
            id: t.Number({ required: true }),
          }),
          detail: {
            description: "Fetch score stats for a BeatLeader score",
          },
        }
      )
      .get(
        "/replay/:scoreId",
        async ({ params: { scoreId } }) => {
          return redirect(await PlayerReplayService.getPlayerReplayUrl(scoreId));
        },
        {
          tags: ["Replay"],
          params: t.Object({
            scoreId: t.String({
              required: true,
              pattern: "^\\d+\\.bsor$",
            }),
          }),
          detail: {
            description: "Redirect to a player's raw replay url for a given score id",
          },
        }
      )
  );
}
