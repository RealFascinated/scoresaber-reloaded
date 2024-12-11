import {Controller, Get} from "elysia-decorators";
import {t} from "elysia";
import PlaylistService from "../service/playlist.service";
import {Swagger} from "../common/swagger";

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
      download: t.Optional(t.Boolean()),
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
                             query: { user, toSnipe, download },
                           }: {
    query: { user: string, toSnipe: string, download?: boolean };
  }) {
    const response = new Response(
      JSON.stringify(await (await PlaylistService.getSnipePlaylist(user, toSnipe)).generateBeatSaberPlaylist(), null, 2)
    );
    response.headers.set("Content-Type", "application/json");
    response.headers.set("Cache-Control", "public, max-age=3600");
    if (download) {
      response.headers.set("Content-Disposition", `attachment; filename="ssr-snipe-${toSnipe}.json"`);
    }
    return response;
  }
}
