import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import PlaylistService from "../service/playlist.service";

@Controller("/playlist")
export default class PlaylistController {
  @Get("/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async getPlaylist({ params: { id } }: { params: { id: string } }): Promise<Response> {
    const response = new Response(
      JSON.stringify(await (await PlaylistService.getPlaylist(id)).generateBeatSaberPlaylist(), null, 2)
    );
    response.headers.set("Content-Type", "application/json");
    response.headers.set("Cache-Control", "public, max-age=3600");
    return response;
  }
}
