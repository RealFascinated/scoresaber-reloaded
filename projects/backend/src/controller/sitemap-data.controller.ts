import { env } from "@ssr/common/env";
import { ScoreSaberLeaderboardModel } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { PlayerModel } from "@ssr/common/model/player";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";

@Controller("/sitemap-data")
export class SitemapDataController {
  @Get("/player-ids", {
    config: {},
    query: t.Object({
      token: t.String(),
    }),
  })
  public async getPlayerIds({ query: { token } }: { query: { token: string } }): Promise<string[]> {
    if (token !== env.SITEMAP_DATA_TOKEN) {
      return [];
    }

    return (await PlayerModel.find({}).select("id")).map(player => player.id);
  }

  @Get("/leaderboard-ids", {
    config: {},
    query: t.Object({
      token: t.String(),
    }),
  })
  public async getLeaderboardIds({
    query: { token },
  }: {
    query: { token: string };
  }): Promise<string[]> {
    if (token !== env.SITEMAP_DATA_TOKEN) {
      return [];
    }

    return (await ScoreSaberLeaderboardModel.find({}).select("id")).map(
      leaderboard => leaderboard.id
    );
  }
}
