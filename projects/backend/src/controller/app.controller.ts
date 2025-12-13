import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { mongoose } from "@typegoose/typegoose";
import { Controller, Get } from "elysia-decorators";
import { getAppVersion } from "../common/app.util";
import { redisClient } from "../common/redis";
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
    const mongo = mongoose.connection.readyState == 1;
    const redis = redisClient.status === "ready";
    if (!mongo || !redis) {
      throw new InternalServerError(`One of our databases is not connected, please contact an admin :(`);
    }

    return {
      status: mongo && redis ? "OK" : "ERROR",
      mongo: mongo ? "CONNECTED" : "ERROR",
      redis: redis ? "CONNECTED" : "ERROR",
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
