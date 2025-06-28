import { Controller, Get } from "elysia-decorators";
import { getAppVersion } from "../common/app.util";
import { AppService } from "../service/app.service";

@Controller()
export default class AppController {
  @Get("/", {
    config: {},
  })
  public async index() {
    return {
      app: "backend",
      version: await getAppVersion(),
    };
  }

  @Get("/health", {
    config: {},
  })
  public async getHealth() {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("/statistics", {
    config: {},
  })
  public async getStatistics() {
    return await AppService.getAppStatistics();
  }
}
