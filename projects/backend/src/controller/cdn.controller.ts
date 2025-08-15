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

  @Get("/map/:mapHash", {
    config: {},
    tags: ["CDN"],
    params: t.Object({
      mapHash: t.String({ required: true }),
    }),
    detail: {
      description: "Fetch a leaderboard's cover art",
    },
  })
  public async getMapArtwork({
    params: { mapHash },
  }: {
    params: {
      mapHash: string;
    };
  }): Promise<unknown> {
    const artwork = await CDNService.getMapArtwork(
      mapHash.includes(".") ? mapHash.split(".")[0] : mapHash
    );
    return new Response(artwork, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": `public, max-age=${TimeUnit.toSeconds(TimeUnit.Day, 7)}`,
      },
    });
  }
}
