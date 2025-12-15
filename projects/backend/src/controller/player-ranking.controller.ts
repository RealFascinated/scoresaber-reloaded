import { Elysia } from "elysia";
import { z } from "zod";
import { PlayerMedalsService } from "../service/player/player-medals.service";
import { PlayerSearchService } from "../service/player/player-search.service";

export default function playerRankingController(app: Elysia) {
  return app.group("/ranking", app =>
    app
      .get(
        "/:page",
        async ({ params: { page }, query: { country, search } }) => {
          return await PlayerSearchService.getPlayerRanking(page, {
            country: country,
            search: search,
          });
        },
        {
          tags: ["Ranking"],
          params: z.object({
            page: z.coerce.number().default(1),
          }),
          query: z.object({
            country: z.string().default("").optional(),
            search: z.string().default("").optional(),
          }),
          detail: {
            description: "Fetch a player's ranking",
          },
        }
      )
      .get(
        "/medals/:page",
        async ({ params: { page }, query: { country } }) => {
          return await PlayerMedalsService.getPlayerMedalRanking(page, country);
        },
        {
          tags: ["Ranking"],
          params: z.object({
            page: z.coerce.number().default(1),
          }),
          query: z.object({
            country: z.string().optional(),
          }),
          detail: {
            description: "Fetch a player's medal ranking",
          },
        }
      )
  );
}
