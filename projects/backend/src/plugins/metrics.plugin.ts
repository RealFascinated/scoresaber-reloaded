import Logger from "@ssr/common/logger";
import { Elysia } from "elysia";
import ResponseTimeHistogramMetric from "../metrics/impl/backend/response-time";
import RequestsPerSecondMetric from "../metrics/impl/backend/total-requests";
import MetricsService, { MetricType } from "../service/metrics.service";

interface RequestStore {
  startTime?: bigint;
  route?: string;
}

type RouteLabelRequest = {
  route?: { path?: string };
};

const resolveRouteLabel = (request: RouteLabelRequest): string => {
  // Only return the matched route template path (e.g. "/player/:id").
  // If Elysia doesn't provide it, return an empty string (caller skips observing).
  return request.route?.path ?? "";
};

export const metricsPlugin = () => {
  let responseTimeMetric: ResponseTimeHistogramMetric | undefined;
  let responseTimeMetricLoaded = false;

  const getResponseTimeMetric = async (): Promise<ResponseTimeHistogramMetric | undefined> => {
    if (responseTimeMetricLoaded) return responseTimeMetric;
    responseTimeMetricLoaded = true;
    responseTimeMetric = (await MetricsService.getMetric(MetricType.RESPONSE_TIME_MS)) as
      | ResponseTimeHistogramMetric
      | undefined;
    return responseTimeMetric;
  };

  return new Elysia()
    .onRequest(async ({ store, request }) => {
      try {
        const rpsMetric = (await MetricsService.getMetric(MetricType.TOTAL_REQUESTS)) as
          | RequestsPerSecondMetric
          | undefined;

        if (rpsMetric) {
          rpsMetric.increment();
        }

        // Raw route template label (e.g. "/player/:id").
        (store as RequestStore).route = resolveRouteLabel(request as RouteLabelRequest);
        (store as RequestStore).startTime = process.hrtime.bigint();
      } catch (error) {
        Logger.error("Failed to increment request counter:", error);
      }
    })
    .onAfterHandle(async ({ store }) => {
      try {
        const requestStore = store as RequestStore;
        if (!requestStore.startTime) return;

        const durationNs = process.hrtime.bigint() - requestStore.startTime;
        const durationMs = Number(durationNs) / 1e6;

        const responseTimeMetricInstance = await getResponseTimeMetric();
        if (!responseTimeMetricInstance) return;

        const route = requestStore.route;
        if (!route) return;

        responseTimeMetricInstance.observe(route, durationMs);
      } catch (error) {
        Logger.error("Failed to observe response time:", error);
      }
    });
};
