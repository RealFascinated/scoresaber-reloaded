import Logger from "@ssr/common/logger";
import { Elysia } from "elysia";
import RequestsPerSecondMetric from "../metrics/impl/backend/requests-per-second";
import RouteLatencyMetric from "../metrics/impl/backend/route-latency";
import MetricsService, { MetricType } from "../service/metrics.service";

interface RequestStore {
  startTime?: bigint;
}

export const metricsPlugin = () => {
  return new Elysia()
    .onRequest(async ({ store }) => {
      try {
        const rpsMetric = (await MetricsService.getMetric(
          MetricType.REQUESTS_PER_SECOND
        )) as RequestsPerSecondMetric;
        rpsMetric.increment();
        (store as RequestStore).startTime = process.hrtime.bigint();
      } catch (error) {
        Logger.error("Failed to increment request counter:", error);
      }
    })
    .onAfterHandle({ as: "global" }, async ({ request, store, route }) => {
      try {
        const startTime = (store as RequestStore).startTime;
        if (startTime) {
          const latency = Number(process.hrtime.bigint() - startTime) / 1_000_000;
          const routeLatencyMetric = (await MetricsService.getMetric(
            MetricType.ROUTE_LATENCY
          )) as RouteLatencyMetric;
          const { method } = request;
          routeLatencyMetric.recordLatency(route, method, latency);
        }
      } catch (error) {
        Logger.error("Failed to record route latency:", error);
      }
    })
    .onError({ as: "global" }, async ({ request, store, route }) => {
      try {
        const startTime = (store as RequestStore).startTime;
        if (startTime) {
          const latency = Number(process.hrtime.bigint() - startTime) / 1_000_000;
          const routeLatencyMetric = (await MetricsService.getMetric(
            MetricType.ROUTE_LATENCY
          )) as RouteLatencyMetric;
          const { method } = request;
          routeLatencyMetric.recordLatency(route, method, latency);
        }
      } catch (error) {
        Logger.error("Failed to record route latency for failed request:", error);
      }
    });
};
