import { PlayerMedalScoresResponse } from "@ssr/common/response/player-medal-scores-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player/player.service";

@Controller("/scores/medals")
export default class MedalsScoresController {
  @Get("/player/:id/:page", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      id: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    detail: {
      description: "Fetch medal scores for a player",
    },
  })
  public async getMedalsScores({
    params: { id, page },
  }: {
    params: {
      id: string;
      page: number;
    };
  }): Promise<PlayerMedalScoresResponse> {
    return (await PlayerService.getPlayerMedalScores(id, page)).toJSON();
  }
}
