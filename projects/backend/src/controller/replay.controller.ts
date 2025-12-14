import { Elysia, redirect, t } from "elysia";
import { PlayerReplayService } from "../service/player/player-replay.service";

export default function replayController(app: Elysia) {
  return app.group("/replay", app =>
    app.get(
      "/:scoreId",
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
