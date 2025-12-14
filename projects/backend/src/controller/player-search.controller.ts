import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { Elysia } from "elysia";
import { z } from "zod";
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
      query: z.object({
        query: z.string().optional(),
      }),
      detail: {
        description: "Search for players",
      },
    }
  );
}
