import { Elysia } from "elysia";
import { getAppVersion } from "../common/app.util";
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
      }
    )
    .get(
      "/health",
      async () => {
        return "OK";
      },
      {
        tags: ["App"],
      }
    )
    .get(
      "/statistics",
      async () => {
        return await AppService.getAppStatistics();
      },
      {
        tags: ["App"],
      }
    );
}
