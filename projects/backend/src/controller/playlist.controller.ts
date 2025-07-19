import { DetailType } from "@ssr/common/detail-type";
import { generateBeatSaberPlaylist } from "@ssr/common/playlist/playlist-utils";
import { parseCustomRankedPlaylistSettings } from "@ssr/common/playlist/ranked/custom-ranked-playlist";
import { parseSnipePlaylistSettings } from "@ssr/common/snipe/snipe-playlist-utils";
import { t } from "elysia";
import { Controller, Get } from "elysia-decorators";
import {
  generateCustomRankedPlaylistImage,
  generateRankedBatchPlaylistImage,
  generateSnipePlaylistImage,
} from "../common/playlist.util";
import PlaylistService, { PlaylistId } from "../service/playlist/playlist.service";
import ScoreSaberService from "../service/scoresaber.service";

@Controller("/playlist")
export default class PlaylistController {
  @Get("/:id", {
    config: {},
    tags: ["Playlist"],
    params: t.Object({
      id: t.String({ required: true, pattern: "^[^/]+(?:\\.[a-zA-Z0-9]+)?$" }),
    }),
    query: t.Object({
      config: t.Optional(t.String()),
      download: t.Optional(t.Boolean()),
    }),
    detail: {
      description: "Fetch a playlist by its id",
    },
  })
  public async getPlaylist({
    params: { id },
    query: { config, download },
  }: {
    params: { id: PlaylistId };
    query: { config?: string; download?: boolean };
  }) {
    id = (id.includes(".") ? id.split(".")[0] : id) as PlaylistId;
    const extension = id.includes(".") ? id.split(".")[1] : "bplist";

    const response = new Response(
      JSON.stringify(
        await generateBeatSaberPlaylist(await PlaylistService.getPlaylist(id, config)),
        null,
        2
      )
    );
    response.headers.set("Content-Type", "application/json");
    if (download) {
      response.headers.set("Content-Disposition", `attachment; filename="ssr-${id}.${extension}"`);
    }
    return response;
  }

  @Get("/snipe", {
    config: {},
    tags: ["Playlist"],
    query: t.Object({
      user: t.String({ required: true }),
      toSnipe: t.String({ required: true }),
      settings: t.Optional(t.String()),
    }),
    detail: {
      description: "Fetch a snipe playlist",
    },
  })
  public async getSnipePlaylist({
    query: { user, toSnipe, settings },
  }: {
    query: { user: string; toSnipe: string; settings: string };
  }) {
    const response = new Response(
      JSON.stringify(
        await generateBeatSaberPlaylist(
          await PlaylistService.getSnipePlaylist(user, toSnipe, settings)
        ),
        null,
        2
      )
    );
    response.headers.set("Content-Type", "application/json");
    return response;
  }

  @Get("/snipe/preview", {
    config: {},
    tags: ["Playlist"],
    query: t.Object({
      toSnipe: t.String({ required: true }),
      settings: t.Optional(t.String()),
    }),
    detail: {
      description: "Fetch a snipe playlist image preview",
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
    return response;
  }

  @Get("/custom-ranked/preview", {
    config: {},
    tags: ["Playlist"],
    query: t.Object({
      settings: t.Optional(t.String()),
    }),
    detail: {
      description: "Fetch a custom ranked playlist image preview",
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
    return response;
  }

  @Get("/ranked-batch/preview", {
    config: {},
    tags: ["Playlist"],
    detail: {
      description: "Fetch a ranked batch playlist image preview",
    },
  })
  public async getRankedBatchPlaylistImagePreview() {
    const response = new Response(Buffer.from(await generateRankedBatchPlaylistImage(), "base64"));
    response.headers.set("Content-Type", "image/png");
    return response;
  }
}
