import { PlayerMedalRankingsResponse } from "@ssr/common/response/player-medal-rankings-response";
import { PlayerRankingsResponse } from "@ssr/common/response/player-rankings-response";
import { Elysia } from "elysia";
import { z } from "zod";
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
      "/ranking/medals/:page",
      async ({ params: { page }, query: { country } }): Promise<PlayerMedalRankingsResponse> => {
        return await PlayerMedalsService.getPlayerMedalRanking(page, country);
      },
      {
        tags: ["Player"],
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
    );
}
