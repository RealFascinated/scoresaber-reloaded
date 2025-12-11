import Logger from "@ssr/common/logger";
import { Elysia } from "elysia";
import RequestsPerSecondMetric from "../metrics/impl/backend/total-requests";
import MetricsService, { MetricType } from "../service/metrics.service";

interface RequestStore {
  startTime?: bigint;
}

export const metricsPlugin = () => {
  return new Elysia().onRequest(async ({ store }) => {
    try {
      const rpsMetric = (await MetricsService.getMetric(MetricType.TOTAL_REQUESTS)) as
        | RequestsPerSecondMetric
        | undefined;

      if (rpsMetric) {
        rpsMetric.increment();
      }

      (store as RequestStore).startTime = process.hrtime.bigint();
    } catch (error) {
      Logger.error("Failed to increment request counter:", error);
    }
  });
};
