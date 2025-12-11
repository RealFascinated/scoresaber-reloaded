import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { TopScoresService } from "../service/score/top-scores.service";

@Controller("")
export default class TopScoresController {
  @Get("/scores/top/:page", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      page: t.Number({ required: true, default: 1 }),
    }),
    detail: {
      description: "Fetch the all-time top scores",
    },
  })
  public async getTopScores({ params: { page } }: { params: { page: number } }): Promise<unknown> {
    return (await TopScoresService.getTopScores(page)).toJSON();
  }
}
