import { Controller, Get } from "elysia-decorators";
import { t } from "elysia";
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
