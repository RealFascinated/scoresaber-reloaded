import { Elysia } from "elysia";
import { getAppVersion } from "../../common/app.util";
import { AppService } from "../../service/app/app.service";

export default function appController(app: Elysia) {
  return app
    .get(
      "/",
      {
        tags: ["App"],
        detail: {
          description: "Return backend name and version",
        },
      },
      async () => {
        return {
          app: "backend",
          version: await getAppVersion(),
        };
      }
    )
    .get(
      "/health",
      {
        tags: ["App"],
        detail: {
          description: "Health check (returns OK)",
        },
      },
      async () => {
        return "OK";
      }
    )
    .get(
      "/statistics",
      {
        tags: ["App"],
        detail: {
          description: "Return backend statistics",
        },
      },
      async () => {
        return await AppService.getAppStatistics();
      }
    );
}
