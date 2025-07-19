import { MiniRankingResponse } from "@ssr/common/response/around-player-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import MiniRankingService from "../service/mini-ranking.service";

@Controller("")
export default class MiniRankingController {
  @Get("/player/mini-ranking/:playerId", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      playerId: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch a player's mini ranking (global and country close rankings)",
    },
  })
  public async getPlayerMiniRanking({
    params: { playerId },
  }: {
    params: { playerId: string };
  }): Promise<MiniRankingResponse> {
    return await MiniRankingService.getPlayerMiniRankings(playerId);
  }
}
