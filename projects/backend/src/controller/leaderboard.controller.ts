import { DetailType } from "@ssr/common/detail-type";
import { PlaysByHmdResponse } from "@ssr/common/response/plays-by-hmd-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { LeaderboardService } from "../service/leaderboard/leaderboard.service";

@Controller("/leaderboard")
export default class LeaderboardController {
  @Get("/by-id/:id", {
    config: {},
    tags: ["leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getLeaderboard({
    params: { id },
    query: { type, superJson },
  }: {
    params: {
      id: string;
    };
    query: { type: DetailType; superJson: boolean };
  }): Promise<unknown> {
    const data = await LeaderboardService.getLeaderboard(id, {
      beatSaverType: type,
      includeBeatSaver: true,
    });
    return superJson ? SuperJSON.stringify(data) : data;
  }

  @Get("/by-hash/:id/:difficulty/:characteristic", {
    config: {},
    tags: ["leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
      difficulty: t.String({ required: true }),
      characteristic: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getLeaderboardByHash({
    params: { id, difficulty, characteristic },
    query: { type, superJson },
  }: {
    params: {
      id: string;
      difficulty: MapDifficulty;
      characteristic: MapCharacteristic;
    };
    query: { type: DetailType; superJson: boolean };
  }): Promise<unknown> {
    const data = await LeaderboardService.getLeaderboardByHash(id, difficulty, characteristic, {
      type,
      includeBeatSaver: true,
    });
    return superJson ? SuperJSON.stringify(data) : data;
  }

  @Get("/plays-by-hmd/:id", {
    config: {},
    tags: ["leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async getPlaysByHmd({
    params: { id },
  }: {
    params: { id: string };
  }): Promise<PlaysByHmdResponse> {
    return LeaderboardService.getPlaysByHmd(id);
  }
}
