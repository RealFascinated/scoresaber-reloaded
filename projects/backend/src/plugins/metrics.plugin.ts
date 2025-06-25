import { HttpCode } from "@ssr/common/http-codes";
import Logger from "@ssr/common/logger";
import { Elysia } from "elysia";
import HttpStatusCodesMetric from "../metrics/impl/backend/http-status-codes";
import RouteLatencyMetric from "../metrics/impl/backend/route-latency";
import RequestsPerSecondMetric from "../metrics/impl/backend/total-requests";
import TotalRequestsPerEndpointMetric from "../metrics/impl/backend/total-requests-per-endpoint";
import MetricsService, { MetricType } from "../service/metrics.service";

interface RequestStore {
  startTime?: bigint;
}

// Helper function to convert HTTP status messages to numeric codes
function getStatusCodeFromMessage(message: string): number | null {
  // Find the matching status code from the HttpCode constant
  for (const [, status] of Object.entries(HttpCode)) {
    if (status.message === message) {
      return status.code;
    }
  }
  return null;
}

export const metricsPlugin = () => {
  return new Elysia()
    .onRequest(async ({ store }) => {
      try {
        const rpsMetric = (await MetricsService.getMetric(
          MetricType.TOTAL_REQUESTS
        )) as RequestsPerSecondMetric;
        rpsMetric.increment();

        (store as RequestStore).startTime = process.hrtime.bigint();
      } catch (error) {
        Logger.error("Failed to increment request counter:", error);
      }
    })
    .onAfterHandle({ as: "global" }, async ({ request, store, route, set }) => {
      try {
        const startTime = (store as RequestStore).startTime;
        if (startTime && route) {
          const latency = Number(process.hrtime.bigint() - startTime) / 1_000_000;
          const routeLatencyMetric = (await MetricsService.getMetric(
            MetricType.ROUTE_LATENCY
          )) as RouteLatencyMetric;
          const { method } = request;
          routeLatencyMetric.recordLatency(route, method, latency);
        }

        // Record HTTP status code
        const httpStatusMetric = (await MetricsService.getMetric(
          MetricType.HTTP_STATUS_CODES
        )) as HttpStatusCodesMetric;
        if (set.status) {
          // Convert string status messages to numbers, or use number directly
          const statusCode =
            typeof set.status === "number" ? set.status : getStatusCodeFromMessage(set.status);
          if (statusCode) {
            httpStatusMetric.recordStatusCode(statusCode);
          }
        }

        const totalRequestsPerEndpointMetric = (await MetricsService.getMetric(
          MetricType.TOTAL_REQUESTS_PER_ENDPOINT
        )) as TotalRequestsPerEndpointMetric;
        totalRequestsPerEndpointMetric.increment(route);
      } catch (error) {
        Logger.error("Failed to record route metrics:", error);
      }
    })
    .onError({ as: "global" }, async ({ request, store, route, error }) => {
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

        // Record HTTP status code for errors (typically 4xx or 5xx)
        const httpStatusMetric = (await MetricsService.getMetric(
          MetricType.HTTP_STATUS_CODES
        )) as HttpStatusCodesMetric;

        // Determine status code from error or default to 500
        let statusCode = 500;
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          typeof (error as { status: unknown }).status === "number"
        ) {
          statusCode = (error as { status: number }).status;
        }
        httpStatusMetric.recordStatusCode(statusCode);
      } catch (error) {
        Logger.error("Failed to record route metrics for failed request:", error);
      }
    });
};
