import Logger from "@ssr/common/logger";
import { Elysia } from "elysia";
import HttpResponseStatusMetric from "../metrics/impl/backend/http-response-status";
import ResponseTimeHistogramMetric from "../metrics/impl/backend/response-time";
import TotalRequestsMetric from "../metrics/impl/backend/total-requests";
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
  let responseStatusMetric: HttpResponseStatusMetric | undefined;
  let responseStatusMetricLoaded = false;
  let totalRequestsMetric: TotalRequestsMetric | undefined;
  let totalRequestsMetricLoaded = false;

  const getResponseTimeMetric = async (): Promise<ResponseTimeHistogramMetric | undefined> => {
    if (responseTimeMetricLoaded) return responseTimeMetric;
    responseTimeMetricLoaded = true;
    responseTimeMetric = (await MetricsService.getMetric(MetricType.RESPONSE_TIME_MS)) as
      | ResponseTimeHistogramMetric
      | undefined;
    return responseTimeMetric;
  };

  const getResponseStatusMetric = async (): Promise<HttpResponseStatusMetric | undefined> => {
    if (responseStatusMetricLoaded) return responseStatusMetric;
    responseStatusMetricLoaded = true;
    responseStatusMetric = (await MetricsService.getMetric(MetricType.HTTP_RESPONSES)) as
      | HttpResponseStatusMetric
      | undefined;
    return responseStatusMetric;
  };

  const getTotalRequestsMetric = async (): Promise<TotalRequestsMetric | undefined> => {
    if (totalRequestsMetricLoaded) return totalRequestsMetric;
    totalRequestsMetricLoaded = true;
    totalRequestsMetric = (await MetricsService.getMetric(MetricType.TOTAL_REQUESTS)) as
      | TotalRequestsMetric
      | undefined;
    return totalRequestsMetric;
  };

  const resolveStatusCode = (response: unknown, setStatus: unknown): number => {
    if (typeof setStatus === "number") {
      return setStatus;
    }
    if (typeof setStatus === "string") {
      const parsed = Number.parseInt(setStatus, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (response instanceof Response) {
      return response.status;
    }
    return 200;
  };

  return new Elysia()
    .onRequest(async ({ store, request }) => {
      try {
        const rpsMetric = await getTotalRequestsMetric();

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
    .onAfterHandle(async ({ store, response, set, request }) => {
      try {
        const requestStore = store as RequestStore;
        // Route metadata may be unavailable during onRequest in some Elysia phases.
        // Resolve again at response time and fallback to the earlier captured value.
        const route = resolveRouteLabel(request as RouteLabelRequest) || requestStore.route;
        if (route) {
          const responseStatusMetricInstance = await getResponseStatusMetric();
          responseStatusMetricInstance?.increment(route, resolveStatusCode(response, set.status));
        }

        if (!requestStore.startTime) return;

        const durationNs = process.hrtime.bigint() - requestStore.startTime;
        const durationMs = Number(durationNs) / 1e6;

        const responseTimeMetricInstance = await getResponseTimeMetric();
        if (!responseTimeMetricInstance) return;

        if (!route) return;

        responseTimeMetricInstance.observe(route, durationMs);
      } catch (error) {
        Logger.error("Failed to observe response time:", error);
      }
    });
};
