import { MiniRankingResponse } from "@ssr/common/response/around-player-response";
import { MiniRankingType } from "@ssr/common/types/around-player";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import MiniRankingService from "../service/scoresaber/mini-ranking.service";

@Controller("")
export default class MiniRankingController {
  @Get("/player/mini-ranking/:playerId", {
    config: {},
    params: t.Object({
      playerId: t.String({ required: true }),
    }),
  })
  public async getPlayerMiniRanking({
    params: { playerId, type },
  }: {
    params: { playerId: string; type: MiniRankingType };
  }): Promise<MiniRankingResponse> {
    return await MiniRankingService.getPlayerMiniRankings(playerId);
  }
}
