import { heapStats } from "bun:jsc";
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
    };
  }

  @Get("/statistics", {
    config: {},
  })
  public async getStatistics() {
    return await AppService.getAppStatistics();
  }

  @Get("/heap-stats", {
    config: {},
  })
  public async getHeapStats() {
    return heapStats();
  }
}
