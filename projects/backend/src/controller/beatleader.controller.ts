import { NotFoundError } from "@ssr/common/error/not-found-error";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import BeatLeaderService from "../service/beatleader.service";

@Controller("/beatleader")
export default class BeatLeaderController {
  @Get("/scorestats/:id", {
    config: {},
    params: t.Object({
      id: t.Number({ required: true }),
    }),
  })
  public async getScoreStats({
    params: { id },
  }: {
    params: {
      id: number;
    };
  }): Promise<unknown> {
    const [current, previous] = await Promise.all([
      BeatLeaderService.getScoreStats(id),
      BeatLeaderService.getPreviousScoreStats(id),
    ]);
    if (!current || !previous) {
      throw new NotFoundError("Score stats not found");
    }

    return {
      current,
      previous,
    };
  }
}
