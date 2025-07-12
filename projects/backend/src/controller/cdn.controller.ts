import { TimeUnit } from "@ssr/common/utils/time-utils";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import CDNService from "../service/cdn.service";

@Controller("/cdn")
export default class CDNController {
  @Get("/avatar/:playerId", {
    config: {},
    params: t.Object({
      playerId: t.String({ required: true }),
    }),
  })
  public async getPlayerAvatar({
    params: { playerId },
  }: {
    params: {
      playerId: string;
    };
  }): Promise<unknown> {
    const avatar = await CDNService.getPlayerAvatar(
      playerId.includes(".") ? playerId.split(".")[0] : playerId
    );
    return new Response(avatar, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": `public, max-age=${TimeUnit.toSeconds(TimeUnit.Hour, 3)}`,
      },
    });
  }

  @Get("/leaderboard/:leaderboardId", {
    config: {},
    params: t.Object({
      leaderboardId: t.String({ required: true }),
    }),
  })
  public async getLeaderboardCoverArt({
    params: { leaderboardId },
  }: {
    params: {
      leaderboardId: string;
    };
  }): Promise<unknown> {
    const coverArt = await CDNService.getLeaderboardCoverArt(
      leaderboardId.includes(".") ? leaderboardId.split(".")[0] : leaderboardId
    );
    return new Response(coverArt, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": `public, max-age=${TimeUnit.toSeconds(TimeUnit.Hour, 3)}`,
      },
    });
  }
}
