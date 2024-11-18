import { Controller, Get } from "elysia-decorators";
import { getAppVersion } from "../common/app.util";
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

  @Get("/health")
  public async getHealth() {
    return "OK";
  }

  @Get("/statistics")
  public async getStatistics() {
    return await AppService.getAppStatistics();
  }
}
