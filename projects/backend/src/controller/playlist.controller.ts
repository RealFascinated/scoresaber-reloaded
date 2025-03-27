import { DetailType } from "@ssr/common/detail-type";
import { parseCustomRankedPlaylistSettings } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import {
  generateCustomRankedPlaylistImage,
  generateSnipePlaylistImage,
} from "../common/playlist.util";
import { Swagger } from "../common/swagger";
import PlaylistService, { SnipeType } from "../service/playlist.service";
import ScoreSaberService from "../service/scoresaber.service";

@Controller("/playlist")
export default class PlaylistController {
  @Get("/:id", {
    config: {},
    tags: ["playlist"],
    params: t.Object({
      id: t.String({ required: true, pattern: "^[^/]+(?:\\.[a-zA-Z0-9]+)?$" }),
    }),
    query: t.Object({
      config: t.Optional(t.String()),
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
    query: { config, download },
  }: {
    params: { id: string };
    query: { config?: string; download?: boolean };
  }) {
    id = id.includes(".") ? id.split(".")[0] : id;
    const extension = id.includes(".") ? id.split(".")[1] : "bplist";

    const response = new Response(
      JSON.stringify(
        await (await PlaylistService.getPlaylist(id, config)).generateBeatSaberPlaylist(),
        null,
        2
      )
    );
    response.headers.set("Content-Type", "application/json");
    response.headers.set("Cache-Control", "public, max-age=3600");
    if (download) {
      response.headers.set("Content-Disposition", `attachment; filename="ssr-${id}.${extension}"`);
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
        await (
          await PlaylistService.getSnipePlaylist(user, toSnipe, type, settings)
        ).generateBeatSaberPlaylist(),
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
      Buffer.from(
        await generateSnipePlaylistImage(parseSnipePlaylistSettings(settings), toSnipePlayer),
        "base64"
      )
    );
    response.headers.set("Content-Type", "image/png");
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  }

  @Get("/custom-ranked/preview", {
    config: {},
    tags: ["playlist"],
    query: t.Object({
      settings: t.Optional(t.String()),
    }),
    detail: {
      responses: {
        200: {
          description: "The custom ranked playlist image preview.",
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Gets the custom ranked playlist image preview.",
    },
  })
  public async getCustomRankedPlaylistImagePreview({
    query: { settings },
  }: {
    query: { settings: string };
  }) {
    const response = new Response(
      Buffer.from(
        await generateCustomRankedPlaylistImage(parseCustomRankedPlaylistSettings(settings)),
        "base64"
      )
    );
    response.headers.set("Content-Type", "image/png");
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  }
}
