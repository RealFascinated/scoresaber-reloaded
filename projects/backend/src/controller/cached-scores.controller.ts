import { PlayerScoresResponse } from "@ssr/common/response/player-scores-response";
import { ScoreSort } from "@ssr/common/types/sort";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player/player.service";

@Controller("/scores/cached")
export default class CachedScoresController {
  @Get("/player/:id/:field/:direction/:page", {
    config: {},
    tags: ["Scores"],
    params: t.Object({
      id: t.String({ required: true }),
      field: t.String({ required: true }),
      direction: t.String({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Optional(
      t.Object({
        rankedOnly: t.Optional(t.Boolean()),
        unrankedOnly: t.Optional(t.Boolean()),
        passedOnly: t.Optional(t.Boolean()),
        search: t.Optional(t.String()),
      })
    ),
    detail: {
      description: "Lookup cached scores for a player",
    },
  })
  public async getCachedScores({
    params: { id, page, field, direction },
    query: filters,
  }: {
    params: {
      id: string;
      field: ScoreSort["field"];
      direction: ScoreSort["direction"];
      page: number;
    };
    query: ScoreSort["filters"] & { search?: string };
  }): Promise<PlayerScoresResponse> {
    const { search, ...otherFilters } = filters;
    return (
      await PlayerService.getScoreSaberCachedPlayerScores(
        id,
        page,
        {
          field,
          direction,
          filters: otherFilters,
        },
        search
      )
    ).toJSON();
  }
}
