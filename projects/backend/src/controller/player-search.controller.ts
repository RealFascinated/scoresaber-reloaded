import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerService } from "../service/player/player.service";

@Controller("")
export default class PlayerSearchController {
  @Get("/player/search", {
    config: {},
    tags: ["Player"],
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
      query: t.Optional(t.String({ default: "" })),
    }),
    detail: {
      description: "Search for players",
    },
  })
  public async searchPlayers({
    query: { superJson, query },
  }: {
    query: { superJson: boolean; query: string };
  }): Promise<PlayerSearchResponse | unknown> {
    const players = {
      players: await PlayerService.searchPlayers(query),
    };
    return superJson ? SuperJSON.stringify(players) : players;
  }
}
