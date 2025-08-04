import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { ScoreService } from "../service/score/score.service";

@Controller("")
export default class TopScoresController {
  @Get("/scores/top/:page", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      page: t.Number({ required: true, default: 1 }),
    }),
    detail: {
      description: "Fetch the top scores for a given timeframe",
    },
  })
  public async getTopScores({ params: { page } }: { params: { page: number } }): Promise<unknown> {
    return (await ScoreService.getTopScores(page)).toJSON();
  }
}
