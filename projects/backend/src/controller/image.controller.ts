import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { ImageService } from "../service/image.service";

@Controller("/image")
export default class ImageController {
  @Get("/averagecolor/:url", {
    config: {},
    params: t.Object({
      url: t.String({ required: true }),
    }),
  })
  public async getImageAverageColor({ params: { url } }: { params: { url: string } }) {
    return await ImageService.getAverageImageColor(url);
  }

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
