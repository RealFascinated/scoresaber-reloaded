import { DetailType } from "@ssr/common/detail-type";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { PlaysByHmdResponse } from "@ssr/common/response/plays-by-hmd-response";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { LeaderboardCoreService } from "../service/leaderboard/leaderboard-core.service";
import { LeaderboardHmdService } from "../service/leaderboard/leaderboard-hmd.service";

@Controller("/leaderboard")
export default class LeaderboardController {
  @Get("/by-id/:id", {
    config: {},
    tags: ["Leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
    }),
    detail: {
      description: "Fetch a leaderboard by its id",
    },
  })
  public async getLeaderboard({
    params: { id },
    query: { type },
  }: {
    params: {
      id: string;
    };
    query: { type: DetailType };
  }): Promise<LeaderboardResponse> {
    return await LeaderboardCoreService.getLeaderboard(id, {
      beatSaverType: type,
      includeBeatSaver: true,
      includeStarChangeHistory: true,
    });
  }

  @Get("/by-hash/:id/:difficulty/:characteristic", {
    config: {},
    tags: ["Leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
      difficulty: t.String({ required: true }),
      characteristic: t.String({ required: true }),
    }),
    query: t.Object({
      type: t.Optional(t.Union([t.Literal("basic"), t.Literal("full")], { default: "basic" })),
    }),
    detail: {
      description: "Fetch a leaderboard by its hash, difficulty, and characteristic",
    },
  })
  public async getLeaderboardByHash({
    params: { id, difficulty, characteristic },
    query: { type },
  }: {
    params: {
      id: string;
      difficulty: MapDifficulty;
      characteristic: MapCharacteristic;
    };
    query: { type: DetailType };
  }): Promise<LeaderboardResponse> {
    const data = await LeaderboardCoreService.getLeaderboardByHash(id, difficulty, characteristic, {
      type,
      includeBeatSaver: true,
      includeStarChangeHistory: true,
    });
    return data;
  }

  @Get("/plays-by-hmd/:id", {
    config: {},
    tags: ["Leaderboard"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch the per hmd usage for a leaderboard",
    },
  })
  public async getPlaysByHmd({ params: { id } }: { params: { id: string } }): Promise<PlaysByHmdResponse> {
    return LeaderboardHmdService.getPlaysByHmd(id);
  }
}
