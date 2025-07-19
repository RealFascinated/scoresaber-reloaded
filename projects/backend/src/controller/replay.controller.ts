import { redirect, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerReplayService } from "../service/player/player-replay.service";

@Controller("/replay")
export default class ReplayController {
  @Get("/:scoreId", {
    config: {},
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
  })
  public async redirectReplay({ params: { scoreId } }: { params: { scoreId: string } }) {
    return redirect(await PlayerReplayService.getPlayerReplayUrl(scoreId));
  }
}
