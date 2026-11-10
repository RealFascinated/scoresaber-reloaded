import { RealmQuerySchema } from "@ssr/common/schemas/realm/realm-query";
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
        {
          tags: ["Ranking"],
          params: t.Object({
            page: t.Integer({ minimum: 1 }),
          }),
          query: t.Evaluate(
            t.Intersect([
              RealmQuerySchema,
              t.Object({
                country: t.Optional(t.String()),
                search: t.Optional(t.String()),
                includeInactives: t.Optional(t.BooleanString()),
              }),
            ])
          ),
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
          params: t.Object({
            page: t.Integer({ minimum: 1 }),
          }),
          query: t.Object({
            country: t.Optional(t.String()),
          }),
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
