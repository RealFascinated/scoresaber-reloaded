import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerService } from "../service/player/player.service";

@Controller("")
export default class PlayerSearchController {
  @Get("/player/search", {
    config: {},
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
      query: t.Optional(t.String({ default: "" })),
    }),
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

  @Get("/player/search/ranking", {
    config: {},
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
      page: t.Optional(t.Number({ default: 1 })),
      country: t.Optional(t.String({ default: "" })),
      search: t.Optional(t.String({ default: "" })),
    }),
  })
  public async searchPlayersRanking({
    query: { superJson, page, country, search },
  }: {
    query: { superJson: boolean; page: number; country: string; search: string };
  }): Promise<PlayerSearchResponse | unknown> {
    const players = await PlayerService.getPlayerRanking(page, {
      country: country,
      search: search,
    });
    return superJson ? SuperJSON.stringify(players) : players;
  }
}
