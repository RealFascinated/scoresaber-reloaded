import { PlayerMedalRankingsResponse } from "@ssr/common/response/player-medal-rankings-response";
import { PlayerRankingsResponse } from "@ssr/common/response/player-rankings-response";
import { Elysia, t } from "elysia";
import { PlayerMedalsService } from "../service/player/player-medals.service";
import { PlayerSearchService } from "../service/player/player-search.service";

export default function playerRankingController(app: Elysia) {
  return app
    .get(
      "/player/search/ranking/:page",
      async ({ params: { page }, query: { country, search } }): Promise<PlayerRankingsResponse> => {
        return await PlayerSearchService.getPlayerRanking(page, {
          country: country,
          search: search,
        });
      },
      {
        tags: ["Player"],
        params: t.Object({
          page: t.Number({ required: true, default: 1 }),
        }),
        query: t.Object({
          country: t.Optional(t.String({ default: "" })),
          search: t.Optional(t.String({ default: "" })),
        }),
        detail: {
          description: "Fetch a player's ranking",
        },
      }
    )
    .get(
      "/ranking/medals/:page",
      async ({ params: { page }, query: { country } }): Promise<PlayerMedalRankingsResponse> => {
        return await PlayerMedalsService.getPlayerMedalRanking(page, country);
      },
      {
        tags: ["Player"],
        params: t.Object({
          page: t.Number({ required: true, default: 1 }),
        }),
        query: t.Object({
          country: t.Optional(t.String()),
        }),
        detail: {
          description: "Fetch a player's medal ranking",
        },
      }
    );
}
