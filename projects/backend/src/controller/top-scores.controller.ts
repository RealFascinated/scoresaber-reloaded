import { Page } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { Elysia, t } from "elysia";
import { TopScoresService } from "../service/score/top-scores.service";

export default function topScoresController(app: Elysia) {
  return app.get(
    "/scores/top/:page",
    async ({ params: { page } }): Promise<Page<PlayerScore>> => {
      return (await TopScoresService.getTopScores(page)).toJSON();
    },
    {
      tags: ["Scores"],
      params: t.Object({
        page: t.Number({ required: true, default: 1 }),
      }),
      detail: {
        description: "Fetch the all-time top scores",
      },
    }
  );
}
