import { Controller, Get } from "elysia-decorators";
import { getAppVersion } from "../common/app-utils";
import { AppService } from "../service/app.service";

@Controller()
export default class AppController {
  @Get("/")
  public async index() {
    return {
      app: "backend",
      version: await getAppVersion(),
    };
  }

  @Get("/statistics")
  public async getStatistics() {
    return await AppService.getAppStatistics();
  }
}
