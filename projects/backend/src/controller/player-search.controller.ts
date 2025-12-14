import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { Elysia, t } from "elysia";
import { PlayerSearchService } from "../service/player/player-search.service";

export default function playerSearchController(app: Elysia) {
  return app.get(
    "/player/search",
    async ({ query: { query } }): Promise<PlayerSearchResponse> => {
      return {
        players: await PlayerSearchService.searchPlayers(query),
      };
    },
    {
      tags: ["Player"],
      query: t.Object({
        query: t.Optional(t.String({ default: "" })),
      }),
      detail: {
        description: "Search for players",
      },
    }
  );
}
