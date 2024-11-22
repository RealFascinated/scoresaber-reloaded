import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
import { ImageService } from "../service/image.service";
import { Swagger } from "../common/swagger";

@Controller("/image")
export default class ImageController {
  @Get("/player/:id", {
    config: {},
    tags: ["image"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The player embed image.",
          content: {
            "image/png": {},
          },
        },
        ...Swagger.responses.playerNotFound,
      },
      description: "Get a player image.",
    },
  })
  public async getPlayerImage({ params: { id } }: { params: { id: string } }) {
    return await ImageService.generatePlayerImage(id);
  }

  @Get("/leaderboard/:id", {
    config: {},
    tags: ["image"],
    params: t.Object({
      id: t.String({ required: true }),
    }),
    detail: {
      responses: {
        200: {
          description: "The leaderboard embed image.",
          content: {
            "image/png": {},
          },
        },
        ...Swagger.responses.leaderboardNotFound,
      },
      description: "Get a leaderboard image.",
    },
  })
  public async getLeaderboardImage({ params: { id } }: { params: { id: string } }) {
    return await ImageService.generateLeaderboardImage(id);
  }
}
