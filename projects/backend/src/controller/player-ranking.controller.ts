import { PlayerMedalRankingsResponse } from "@ssr/common/response/player-medal-rankings-response";
import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerMedalsService } from "../service/player/player-medals.service";
import { PlayerService } from "../service/player/player.service";

@Controller("")
export default class PlayerRankingController {
  @Get("/player/search/ranking", {
    config: {},
    tags: ["Player"],
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
      page: t.Optional(t.Number({ default: 1 })),
      country: t.Optional(t.String({ default: "" })),
      search: t.Optional(t.String({ default: "" })),
    }),
    detail: {
      description: "Fetch a player's ranking",
    },
  })
  public async getPlayerRanking({
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

  @Get("/ranking/medals/:page", {
    config: {},
    tags: ["Player"],
    params: t.Object({
      page: t.Number({ required: true, default: 1 }),
    }),
    query: t.Object({
      superJson: t.Optional(t.Boolean({ default: false })),
      country: t.Optional(t.String()),
    }),
    detail: {
      description: "Fetch a player's medal ranking",
    },
  })
  public async getPlayerMedalRanking({
    params: { page },
    query: { superJson, country },
  }: {
    params: { page: number };
    query: { superJson: boolean; country?: string };
  }): Promise<PlayerMedalRankingsResponse | unknown> {
    const players = await PlayerMedalsService.getPlayerMedalRanking(page, country);
    return superJson ? SuperJSON.stringify(players) : players;
  }
}
