import { NotFoundError } from "@ssr/common/error/not-found-error";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { Page } from "@ssr/common/pagination";
import { PlayerScore } from "@ssr/common/score/player-score";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player/player.service";

@Controller("")
export default class FriendsController {
  @Get("/scores/friends/leaderboard/:leaderboardId/:page", {
    config: {},
    tags: ["Friends"],
    params: t.Object({
      leaderboardId: t.Number({ required: true }),
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch friend leaderboard scores for a player",
    },
  })
  public async getFriendLeaderboardScores({
    params: { leaderboardId, page },
    query: { friendIds },
  }: {
    params: {
      leaderboardId: number;
      page: number;
    };
    query: { friendIds: string };
  }): Promise<Page<ScoreSaberScore>> {
    const ids = friendIds.split(",");
    if (ids.length === 0) {
      throw new NotFoundError("Malformed friend ids, must be a comma separated list of friend ids");
    }
    return await PlayerService.getPlayerFriendLeaderboardScores(ids, leaderboardId, page);
  }

  @Get("/scores/friends/:page", {
    config: {},
    tags: ["Friends"],
    params: t.Object({
      page: t.Number({ required: true }),
    }),
    query: t.Object({
      friendIds: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch friend scores for a player",
    },
  })
  public async getFriendScores({
    params: { page },
    query: { friendIds },
  }: {
    params: {
      page: number;
    };
    query: { friendIds: string };
  }): Promise<Page<PlayerScore<ScoreSaberScore, ScoreSaberLeaderboard>>> {
    const ids = friendIds.split(",");
    if (ids.length === 0) {
      throw new NotFoundError("Malformed friend ids, must be a comma separated list of friend ids");
    }
    return await PlayerService.getPlayerFriendScores(ids, page);
  }
}
