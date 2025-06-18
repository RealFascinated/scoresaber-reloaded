import { NotFoundError } from "@ssr/common/error/not-found-error";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import SuperJSON from "superjson";
import { FriendScoresService } from "../service/score/friend-scores.service";

@Controller("/friend")
export default class FriendsController {
  @Get("/leaderboard-scores/:leaderboardId/:page", {
    config: {},
    params: t.Object({
      leaderboardId: t.Number({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getFriendLeaderboardScores({
    params: { leaderboardId, page },
    query: { friendIds, superJson },
  }: {
    params: {
      leaderboardId: number;
      page: number;
    };
    query: { friendIds: string; superJson: boolean };
  }): Promise<unknown> {
    const ids = friendIds.split(",");
    if (ids.length === 0) {
      throw new NotFoundError("Malformed friend ids, must be a comma separated list of friend ids");
    }
    const data = await FriendScoresService.getFriendLeaderboardScores(ids, leaderboardId, page);
    return superJson ? SuperJSON.stringify(data) : data.toJSON();
  }

  @Get("/recent-scores/:page", {
    config: {},
    params: t.Object({
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
      superJson: t.Optional(t.Boolean({ default: false })),
    }),
  })
  public async getFriendScores({
    params: { page },
    query: { friendIds, superJson },
  }: {
    params: {
      page: number;
    };
    query: { friendIds: string; superJson: boolean };
  }): Promise<unknown> {
    const ids = friendIds.split(",");
    if (ids.length === 0) {
      throw new NotFoundError("Malformed friend ids, must be a comma separated list of friend ids");
    }
    const data = await FriendScoresService.getFriendScores(ids, page);
    return superJson ? SuperJSON.stringify(data) : data.toJSON();
  }
}
