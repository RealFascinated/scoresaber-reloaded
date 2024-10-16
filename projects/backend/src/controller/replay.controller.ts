import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { ReplayService } from "../service/replay.service";

@Controller("/replay")
export default class ReplayController {
  @Get("/:playerId/:leaderboardId", {
    config: {},
    params: t.Object({
      playerId: t.String({ required: true }),
      leaderboardId: t.String({ required: true }),
    }),
  })
  public async getOpenGraphImage({
    params: { playerId, leaderboardId },
  }: {
    params: { playerId: string; leaderboardId: string };
  }) {
    return ReplayService.getReplay(playerId, leaderboardId);
  }
}
