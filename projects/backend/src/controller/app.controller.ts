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

  @Get("/health", {
    config: {},
    detail: {
      description: "Get the health of the app.",
    },
  })
  public async getHealth() {
    return {
      status: "OK",
    };
  }

  @Get("/statistics", {
    config: {},
    detail: {
      description: "Get the statistics for the app.",
    },
  })
  public async getStatistics() {
    return await AppService.getAppStatistics();
  }
}
