import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import PlaylistService, { SnipeType } from "../service/playlist.service";
import { Swagger } from "../common/swagger";
import { generateSnipePlaylistImage } from "../common/playlist.util";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import ScoreSaberService from "../service/scoresaber.service";
import { DetailType } from "@ssr/common/detail-type";

@Controller("/playlist")
export default class PlaylistController {
  @Get("/:id", {
    config: {},
    tags: ["playlist"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    query: t.Object({
      download: t.Optional(t.Boolean()),
    }),
    detail: {
      responses: {
        200: {
          description: "The playlist.",
        },
        ...Swagger.responses.playlistNotFound,
      },
      description: "Lookup a playlist",
    },
  })
  public async getPlaylist({
    params: { id },
    query: { download },
  }: {
    params: { id: string };
    query: { download?: boolean };
  }) {
    const response = new Response(
      JSON.stringify(await (await PlaylistService.getPlaylist(id)).generateBeatSaberPlaylist(), null, 2)
    );
    response.headers.set("Content-Type", "application/json");
    response.headers.set("Cache-Control", "public, max-age=3600");
    if (download) {
      response.headers.set("Content-Disposition", `attachment; filename="ssr-${id}.json"`);
    }
    return response;
  }

  @Get("/snipe", {
    config: {},
    tags: ["playlist"],
    query: t.Object({
      user: t.String({ required: true }),
      toSnipe: t.String({ required: true }),
      type: t.Optional(t.String({ allowedValues: ["top", "recent"] })),
      settings: t.Optional(t.String()),
    }),
    detail: {
      responses: {
        200: {
          description: "The snipe playlist.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Creates a snipe playlist",
    },
  })
  public async getSnipePlaylist({
    query: { user, toSnipe, type, settings },
  }: {
    query: { user: string; toSnipe: string; type: SnipeType; settings: string };
  }) {
    const response = new Response(
      JSON.stringify(
        await (await PlaylistService.getSnipePlaylist(user, toSnipe, type, settings)).generateBeatSaberPlaylist(),
        null,
        2
      )
    );
    response.headers.set("Content-Type", "application/json");
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  }

  @Get("/snipe/preview", {
    config: {},
    tags: ["playlist"],
    query: t.Object({
      toSnipe: t.String({ required: true }),
      settings: t.Optional(t.String()),
    }),
    detail: {
      responses: {
        200: {
          description: "The snipe playlist image preview.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Gets the snipe playlist image preview.",
    },
  })
  public async getSnipePlaylistImagePreview({
    query: { toSnipe, settings },
  }: {
    query: { toSnipe: string; settings: string };
  }) {
    const toSnipePlayer = await ScoreSaberService.getPlayer(toSnipe, DetailType.BASIC);
    const response = new Response(
      Buffer.from(await generateSnipePlaylistImage(parseSnipePlaylistSettings(settings), toSnipePlayer), "base64")
    );
    response.headers.set("Content-Type", "image/png");
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  }
}
