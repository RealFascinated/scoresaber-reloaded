import { TimeUnit } from "@ssr/common/utils/time-utils";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import CDNService from "../service/cdn.service";

@Controller("/cdn")
export default class CDNController {
  @Get("/avatar/:playerId", {
    config: {},
    tags: ["CDN"],
    params: t.Object({
      playerId: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch a player's avatar",
    },
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
        "Cache-Control": `public, max-age=${TimeUnit.toSeconds(TimeUnit.Day, 7)}`,
      },
    });
  }

  @Get("/leaderboard/:leaderboardId", {
    config: {},
    tags: ["CDN"],
    params: t.Object({
      leaderboardId: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch a leaderboard's cover art",
    },
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
        "Cache-Control": `public, max-age=${TimeUnit.toSeconds(TimeUnit.Day, 7)}`,
      },
    });
  }
}
