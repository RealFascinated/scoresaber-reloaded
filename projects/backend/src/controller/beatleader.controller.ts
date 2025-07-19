import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import BeatLeaderService from "../service/beatleader.service";

@Controller("/beatleader")
export default class BeatLeaderController {
  @Get("/scorestats/:id", {
    config: {},
    tags: ["BeatLeader"],
    params: t.Object({
      id: t.Number({ required: true }),
    }),
    detail: {
      description: "Fetch score stats for a BeatLeader score",
    },
  })
  public async getScoreStats({
    params: { id },
  }: {
    params: {
      id: number;
    };
  }): Promise<unknown> {
    return await BeatLeaderService.getScoresFullScoreStats(id);
  }
}
