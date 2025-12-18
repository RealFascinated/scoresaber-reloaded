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
        detail: {
          description: "Return backend name and version",
        },
      }
    )
    .get(
      "/health",
      async () => {
        return "OK";
      },
      {
        tags: ["App"],
        detail: {
          description: "Health check (returns OK)",
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
          description: "Return backend statistics",
        },
      }
    );
}
