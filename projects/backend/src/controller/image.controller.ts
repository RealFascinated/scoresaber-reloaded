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

  @Get("/test", {
    config: {},
  })
  public async test() {
    const image = new SSRImage({
      width: 256,
      height: 256,
    });
    await image.setBackgroundImage("https://cdn.fascinated.cc/cFkchQkc.png");
    image.drawText(
      [
        {
          text: "SSR",
          color: "#000",
          fontSize: 42,
          fontFamily: "SSR",
        },
        {
          text: "Ranked Maps",
          color: "#222222",
          fontSize: 30,
          fontFamily: "SSR",
        },
      ],
      "center",
      0.8
    );

    return new Response(await image.build(), {
      headers: {
        "Content-Type": "image/png",
      },
    });
  }
}
