import { PlayerMedalRankingsResponse } from "@ssr/common/response/player-medal-rankings-response";
import { PlayerSearchResponse } from "@ssr/common/response/player-search-response";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { PlayerMedalsService } from "../service/player/player-medals.service";
import { PlayerService } from "../service/player/player.service";
import { Page } from "@ssr/common/pagination";
import { ScoreSaberPlayer } from "@ssr/common/model/player/impl/scoresaber-player";
import { PlayerRankingsResponse } from "@ssr/common/response/player-rankings-response";

@Controller("")
export default class PlayerRankingController {
  @Get("/player/search/ranking", {
    config: {},
    tags: ["Player"],
    query: t.Object({
      page: t.Optional(t.Number({ default: 1 })),
      country: t.Optional(t.String({ default: "" })),
      search: t.Optional(t.String({ default: "" })),
    }),
    detail: {
      description: "Fetch a player's ranking",
    },
  })
  public async getPlayerRanking({
    query: { page, country, search },
  }: {
    query: { page: number; country: string; search: string };
  }): Promise<PlayerRankingsResponse> {
    return await PlayerService.getPlayerRanking(page, {
      country: country,
      search: search,
    });
  }

  @Get("/ranking/medals/:page", {
    config: {},
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
  })
  public async getPlayerMedalRanking({
    params: { page },
    query: { country },
  }: {
    params: { page: number };
    query: { country?: string };
  }): Promise<PlayerMedalRankingsResponse> {
    return await PlayerMedalsService.getPlayerMedalRanking(page, country);
  }
}
