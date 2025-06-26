import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerMedalsService } from "../service/player/player-medals.service";

@Controller("")
export default class PlayerRankingController {
  @Get("/ranking/medals/:page", {
    config: {},
    params: t.Object({
      page: t.Number({ required: true, default: 1 }),
    }),
  })
  public async getPlayerMedalRanking({
    params: { page },
  }: {
    params: { page: number };
  }): Promise<unknown> {
    return (await PlayerMedalsService.getPlayerMedalRanking(page)).toJSON();
  }
}
