import HttpResponseStatusMetric from "../metrics/impl/backend/http-response-status";
import ResponseTimeHistogramMetric from "../metrics/impl/backend/response-time";
import TotalRequestsMetric from "../metrics/impl/backend/total-requests";
import MetricsService, { MetricType } from "../service/infra/metrics.service";

type RequestHookContext = {
  request: Request;
  route?: string;
};

type AfterHandleHookContext = {
  request: Request;
  route?: string;
  response: unknown;
  set: { status?: number | string };
};

/** Prometheus scrape endpoint — exclude from HTTP request / latency / status metrics. */
const METRICS_PATH = "/metrics";

function isMetricsRequest(request: Request): boolean {
  return new URL(request.url).pathname === METRICS_PATH;
}

export const createHttpMetricsHooks = () => {
  const requestStartTimes = new Map<Request, bigint>();

  let totalRequestsMetric: TotalRequestsMetric | undefined;
  let totalRequestsMetricLoaded = false;
  let responseStatusMetric: HttpResponseStatusMetric | undefined;
  let responseStatusMetricLoaded = false;
  let responseTimeMetric: ResponseTimeHistogramMetric | undefined;
  let responseTimeMetricLoaded = false;

  const getStatusCode = (response: unknown, setStatus: unknown): number => {
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

  const getTotalRequestsMetric = async (): Promise<TotalRequestsMetric | undefined> => {
    if (totalRequestsMetricLoaded) {
      return totalRequestsMetric;
    }
    const metric = MetricsService.getMetric<TotalRequestsMetric>(MetricType.TOTAL_REQUESTS);
    if (!metric) {
      return undefined;
    }
    totalRequestsMetric = metric;
    totalRequestsMetricLoaded = true;
    return totalRequestsMetric;
  };

  const getResponseStatusMetric = async (): Promise<HttpResponseStatusMetric | undefined> => {
    if (responseStatusMetricLoaded) {
      return responseStatusMetric;
    }
    const metric = MetricsService.getMetric<HttpResponseStatusMetric>(MetricType.HTTP_RESPONSES);
    responseStatusMetric = metric;
    responseStatusMetricLoaded = true;
    return responseStatusMetric;
  };

  const getResponseTimeMetric = async (): Promise<ResponseTimeHistogramMetric | undefined> => {
    if (responseTimeMetricLoaded) {
      return responseTimeMetric;
    }
    const metric = MetricsService.getMetric<ResponseTimeHistogramMetric>(MetricType.RESPONSE_TIME_MS);
    responseTimeMetric = metric;
    responseTimeMetricLoaded = true;
    return responseTimeMetric;
  };

  return {
    onRequest: async ({ request }: RequestHookContext): Promise<void> => {
      if (isMetricsRequest(request)) {
        return;
      }
      requestStartTimes.set(request, process.hrtime.bigint());
      const requestsMetric = await getTotalRequestsMetric();
      requestsMetric?.increment();
    },
    onAfterHandle: async ({ request, route, response, set }: AfterHandleHookContext): Promise<void> => {
      if (isMetricsRequest(request)) {
        requestStartTimes.delete(request);
        return;
      }
      if (!route) {
        requestStartTimes.delete(request);
        return;
      }

      const statusCode = getStatusCode(response, set.status);
      const responseMetric = await getResponseStatusMetric();
      responseMetric?.increment(route, statusCode);

      const startedAt = requestStartTimes.get(request);
      requestStartTimes.delete(request);
      if (!startedAt) {
        return;
      }

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const responseTimeHistogramMetric = await getResponseTimeMetric();
      responseTimeHistogramMetric?.observe(route, durationMs);
    },
  };
};
