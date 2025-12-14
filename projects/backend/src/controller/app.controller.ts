import { InternalServerError } from "@ssr/common/error/internal-server-error";
import { mongoose } from "@typegoose/typegoose";
import { Elysia } from "elysia";
import { getAppVersion } from "../common/app.util";
import { redisClient } from "../common/redis";
import { AppService } from "../service/app.service";

export default function appController(app: Elysia) {
  return app
    .get(
      "/",
      async () => {
        return {
          app: "backend",
          version: await getAppVersion(),
        };
      },
      {
        tags: ["App"],
        detail: {
          description: "Fetch basic application info",
        },
      }
    )
    .get(
      "/health",
      async () => {
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
      },
      {
        tags: ["App"],
        detail: {
          description: "Fetch application health",
        },
      }
    )
    .get(
      "/statistics",
      async () => {
        return await AppService.getAppStatistics();
      },
      {
        tags: ["App"],
        detail: {
          description: "Fetch application statistics",
        },
      }
    );
}
