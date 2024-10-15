import { Controller, Get } from "elysia-decorators";
import { PlayerService } from "../service/player.service";
import { t } from "elysia";
import { PlayerHistory } from "@ssr/common/types/player/player-history";
import { PlayerTrackedSince } from "@ssr/common/types/player/player-tracked-since";
import { ImageService } from "../service/image.service";

@Controller("/image")
export default class ImageController {
  @Get("/player/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async getOpenGraphImage({ params: { id } }: { params: { id: string } }) {
    return await ImageService.generateOpenGraphImage(id);
  }
}
