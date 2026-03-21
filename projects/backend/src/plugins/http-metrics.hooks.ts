import HttpResponseStatusMetric from "../metrics/impl/backend/http-response-status";
import ResponseTimeHistogramMetric from "../metrics/impl/backend/response-time";
import TotalRequestsMetric from "../metrics/impl/backend/total-requests";
import MetricsService, { MetricType } from "../service/metrics.service";

type RequestHookContext = {
  request: Request;
  route?: string;
};

type AfterHandleHookContext = {
  request: Request;
  /** Registered path pattern, e.g. `/player/:id` — may be empty if the hook runs before routes are composed. */
  route?: string;
  /** Actual path (no query); used as a fallback label when `route` is missing. */
  path?: string;
  response: unknown;
  set: { status?: number | string };
};

export const createHttpMetricsHooks = () => {
  const requestStartTimes = new Map<Request, bigint>();

  let totalRequestsMetric: TotalRequestsMetric | undefined;
  let totalRequestsMetricLoaded = false;
  let responseStatusMetric: HttpResponseStatusMetric | undefined;
  let responseStatusMetricLoaded = false;
  let responseTimeMetric: ResponseTimeHistogramMetric | undefined;
  let responseTimeMetricLoaded = false;

  const getStatusCode = (response: unknown, setStatus: unknown): number => {
    if (typeof setStatus === "number") return setStatus;
    if (typeof setStatus === "string") {
      const parsed = Number.parseInt(setStatus, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
    if (response instanceof Response) return response.status;
    return 200;
  };

  const getTotalRequestsMetric = async (): Promise<TotalRequestsMetric | undefined> => {
    if (totalRequestsMetricLoaded) return totalRequestsMetric;
    const metric = MetricsService.getMetric<TotalRequestsMetric>(MetricType.TOTAL_REQUESTS);
    if (!metric) return undefined;
    totalRequestsMetric = metric;
    totalRequestsMetricLoaded = true;
    return metric;
  };

  const getResponseStatusMetric = async (): Promise<HttpResponseStatusMetric | undefined> => {
    if (responseStatusMetricLoaded) return responseStatusMetric;
    const metric = MetricsService.getMetric<HttpResponseStatusMetric>(MetricType.HTTP_RESPONSES);
    responseStatusMetric = metric;
    responseStatusMetricLoaded = true;
    return metric;
  };

  const getResponseTimeMetric = async (): Promise<ResponseTimeHistogramMetric | undefined> => {
    if (responseTimeMetricLoaded) return responseTimeMetric;
    const metric = MetricsService.getMetric<ResponseTimeHistogramMetric>(MetricType.RESPONSE_TIME_MS);
    responseTimeMetric = metric;
    responseTimeMetricLoaded = true;
    return metric;
  };

  return {
    /**
     * Drop timing state when a request errors before `onAfterHandle` runs; otherwise
     * `Request` objects stay in the Map and the heap grows without bound.
     */
    cleanupRequest: (request: Request): void => {
      requestStartTimes.delete(request);
    },
    onRequest: async ({ request }: RequestHookContext): Promise<void> => {
      requestStartTimes.set(request, process.hrtime.bigint());
      const requestsMetric = await getTotalRequestsMetric();
      requestsMetric?.increment();
    },
    onAfterHandle: async ({ request, route, path, response, set }: AfterHandleHookContext): Promise<void> => {
      const routeLabel = route && route.length > 0 ? route : path;
      if (!routeLabel) {
        requestStartTimes.delete(request);
        return;
      }

      const statusCode = getStatusCode(response, set.status);
      const responseMetric = await getResponseStatusMetric();
      responseMetric?.increment(routeLabel, statusCode);

      const startedAt = requestStartTimes.get(request);
      requestStartTimes.delete(request);
      if (!startedAt) return;

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const responseTimeHistogramMetric = await getResponseTimeMetric();
      responseTimeHistogramMetric?.observe(routeLabel, durationMs);
    },
  };
};
