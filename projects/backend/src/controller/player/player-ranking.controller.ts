import { MedalRankingQuerySchema, PlayerRankingQuerySchema } from "@ssr/common/schemas/ranking/ranking-route";
import { PlayerRankingsResponseSchema } from "@ssr/common/schemas/response/player/player-rankings";
import { PlayerMedalRankingsResponseSchema } from "@ssr/common/schemas/response/ranking/medal-rankings";
import { PagePathParamsSchema } from "@ssr/common/schemas/route/route-params";
import { Elysia } from "elysia";
import { PlayerMedalsService } from "../../service/medals/player-medals.service";
import { PlayerSearchService } from "../../service/player/player-search.service";

export default function playerRankingController(app: Elysia) {
  return app.group("/ranking", app =>
    app
      .get(
        "/:page",
        {
          tags: ["Ranking"],
          params: PagePathParamsSchema,
          query: PlayerRankingQuerySchema,
          response: PlayerRankingsResponseSchema,
          detail: {
            description: "Fetch player ranking",
          },
        },
        async ({ params: { page }, query: { country, search, includeInactives, realmId } }) => {
          return await PlayerSearchService.getPlayerRanking(page, {
            country: country ?? "",
            search: search ?? "",
            includeInactives: includeInactives ?? false,
            realmId,
          });
        }
      )
      .get(
        "/medals/:page",
        {
          tags: ["Ranking"],
          params: PagePathParamsSchema,
          query: MedalRankingQuerySchema,
          response: PlayerMedalRankingsResponseSchema,
          detail: {
            description: "Fetch medal ranking",
          },
        },
        async ({ params: { page }, query: { country } }) => {
          return await PlayerMedalsService.getPlayerMedalRanking(page, country);
        }
      )
  );
}
