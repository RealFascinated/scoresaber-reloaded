import { redirect, t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerReplayService } from "../service/player/player-replay.service";

@Controller("/replay")
export default class ReplayController {
  @Get("/:scoreId", {
    config: {},
    params: t.Object({
      scoreId: t.String({
        required: true,
        pattern: "^\\d+\\.bsor$",
      }),
    }),
  })
  public async redirectReplay({ params: { scoreId } }: { params: { scoreId: string } }) {
    return redirect(await PlayerReplayService.getPlayerReplayUrl(scoreId));
  }
}
