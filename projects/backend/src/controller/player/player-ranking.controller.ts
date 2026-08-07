import { PlayerRankingsResponseSchema } from "@ssr/common/schemas/response/player/player-rankings";
import { PlayerMedalRankingsResponseSchema } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { Elysia, t } from "elysia";
import { PlayerMedalsService } from "../../service/medals/player-medals.service";
import { PlayerSearchService } from "../../service/player/player-search.service";

export default function playerRankingController(app: Elysia) {
  return app.group("/ranking", app =>
    app
      .get(
        "/:page",
        async ({ params: { page }, query: { country, search, includeInactives } }) => {
          return await PlayerSearchService.getPlayerRanking(page, {
            country: country,
            search: search,
            includeInactives: includeInactives,
          });
        },
        {
          tags: ["Ranking"],
          params: t.Object({
            page: t.Number({ default: 1 }),
          }),
          query: t.Object({
            country: t.Optional(t.String({ default: "" })),
            search: t.Optional(t.String({ default: "" })),
            includeInactives: t.Optional(t.BooleanString({ default: false })),
          }),
          response: PlayerRankingsResponseSchema,
          detail: {
            description: "Fetch player ranking",
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
          params: t.Object({
            page: t.Number({ default: 1 }),
          }),
          query: t.Object({
            country: t.Optional(t.String()),
          }),
          response: PlayerMedalRankingsResponseSchema,
          detail: {
            description: "Fetch medal ranking",
          },
        }
      )
  );
}
