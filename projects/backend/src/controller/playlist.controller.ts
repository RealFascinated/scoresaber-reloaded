import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import PlaylistService from "../service/playlist.service";
import { Swagger } from "../common/swagger";

@Controller("/playlist")
export default class PlaylistController {
  @Get("/:id", {
    config: {},
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
      response.headers.set("Content-Disposition", `attachment; filename="${id}.json"`);
    }
    return response;
  }
}
