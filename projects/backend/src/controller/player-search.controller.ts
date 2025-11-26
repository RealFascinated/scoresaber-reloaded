import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player/player.service";

@Controller("")
export default class PlayerSearchController {
  @Get("/player/search", {
    config: {},
    tags: ["Player"],
    query: t.Object({
      query: t.Optional(t.String({ default: "" })),
    }),
    detail: {
      description: "Search for players",
    },
  })
  public async searchPlayers({
    query: { query },
  }: {
    query: { query: string };
  }): Promise<PlayerSearchResponse> {
    return {
      players: await PlayerService.searchPlayers(query),
    };
  }
}
