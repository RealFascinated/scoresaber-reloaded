import { Controller, Get } from "elysia-decorators";
import { getAppVersion } from "../common/app.util";
import { AppService } from "../service/app.service";

@Controller()
export default class AppController {
  @Get("/", {
    config: {},
    tags: ["App"],
    detail: {
      description: "Fetch basic application info",
    },
  })
  public async index() {
    return {
      app: "backend",
      version: await getAppVersion(),
    };
  }

  @Get("/health", {
    config: {},
    tags: ["App"],
    detail: {
      description: "Fetch application health",
    },
  })
  public async getHealth() {
    return {
      status: "OK",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("/statistics", {
    config: {},
    tags: ["App"],
    detail: {
      description: "Fetch application statistics",
    },
  })
  public async getStatistics() {
    return await AppService.getAppStatistics();
  }
}
