import { env } from "@ssr/common/env";
import { isProduction } from "@ssr/common/utils/utils";
import { timingSafeEqual } from "crypto";
import { Elysia } from "elysia";
import { prometheusRegistry } from "../../metrics/prometheus";

export default function metricsController(app: Elysia) {
  return app.get(
    "/metrics",
    async ({ headers, set }) => {
      // Validate Bearer token (skip in development)
      if (isProduction()) {
        const authHeader = headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          set.status = 401;
          return { error: "Unauthorized" };
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix

        const expectedToken = env.PROMETHEUS_AUTH_TOKEN;
        if (typeof expectedToken !== "string") {
          set.status = 500;
          return { error: "Server misconfigured" };
        }

        const tokenBuf = Buffer.from(token);
        const expectedBuf = Buffer.from(expectedToken);
        if (tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
          set.status = 401;
          return { error: "Unauthorized" };
        }
      }

      // Export Prometheus metrics
      set.headers["content-type"] = "text/plain; version=0.0.4; charset=utf-8";
      return await prometheusRegistry.metrics();
    },
    {
      detail: {
        description: "Prometheus metrics endpoint (requires Bearer token authentication in production)",
        tags: [],
      },
    }
  );
}
