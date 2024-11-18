import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { ImageService } from "../service/image.service";
import SSRImage from "../common/ssr-image";

@Controller("/image")
export default class ImageController {
  @Get("/player/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async getPlayerImage({ params: { id } }: { params: { id: string } }) {
    return await ImageService.generatePlayerImage(id);
  }

  @Get("/leaderboard/:id", {
    config: {},
    params: t.Object({
      id: t.String({ required: true }),
    }),
  })
  public async getLeaderboardImage({ params: { id } }: { params: { id: string } }) {
    return await ImageService.generateLeaderboardImage(id);
  }
}
