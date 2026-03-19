import HttpResponseStatusMetric from "../metrics/impl/backend/http-response-status";
import ResponseTimeHistogramMetric from "../metrics/impl/backend/response-time";
import TotalRequestsMetric from "../metrics/impl/backend/total-requests";
import MetricsService, { MetricType } from "../service/metrics.service";

type RequestHookContext = {
  request: Request;
};

type AfterHandleHookContext = {
  request: Request;
  response: unknown;
  set: { status?: number | string };
};

export const createHttpMetricsHooks = () => {
  const requestStartTimes = new Map<Request, bigint>();
  const requestRoutes = new Map<Request, string>();

  let totalRequestsMetric: TotalRequestsMetric | undefined;
  let totalRequestsMetricLoaded = false;
  let responseStatusMetric: HttpResponseStatusMetric | undefined;
  let responseStatusMetricLoaded = false;
  let responseTimeMetric: ResponseTimeHistogramMetric | undefined;
  let responseTimeMetricLoaded = false;

  const getSanitizedPathLabel = (request: Request): string => {
    try {
      const pathname = new URL(request.url).pathname || "/";
      return pathname
        .replace(/\/\d+(?=\/|$)/g, "/:id")
        .replace(/\/[0-9a-f]{16,}(?=\/|$)/gi, "/:id")
        .replace(/\/[A-Za-z0-9_-]{24,}(?=\/|$)/g, "/:id");
    } catch {
      return "unknown";
    }
  };

  const getRouteLabel = (request: Request): string => {
    const routePath = (request as unknown as { route?: { path?: string } }).route?.path;
    return routePath || requestRoutes.get(request) || getSanitizedPathLabel(request);
  };

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
    const metric = (await MetricsService.getMetric(MetricType.TOTAL_REQUESTS)) as
      | TotalRequestsMetric
      | undefined;
    if (!metric) return undefined;
    totalRequestsMetric = metric;
    totalRequestsMetricLoaded = true;
    return metric;
  };

  const getResponseStatusMetric = async (): Promise<HttpResponseStatusMetric | undefined> => {
    if (responseStatusMetricLoaded) return responseStatusMetric;
    const metric = (await MetricsService.getMetric(MetricType.HTTP_RESPONSES)) as
      | HttpResponseStatusMetric
      | undefined;
    if (!metric) return undefined;
    responseStatusMetric = metric;
    responseStatusMetricLoaded = true;
    return metric;
  };

  const getResponseTimeMetric = async (): Promise<ResponseTimeHistogramMetric | undefined> => {
    if (responseTimeMetricLoaded) return responseTimeMetric;
    const metric = (await MetricsService.getMetric(MetricType.RESPONSE_TIME_MS)) as
      | ResponseTimeHistogramMetric
      | undefined;
    if (!metric) return undefined;
    responseTimeMetric = metric;
    responseTimeMetricLoaded = true;
    return metric;
  };

  return {
    onRequest: async ({ request }: RequestHookContext): Promise<void> => {
      requestStartTimes.set(request, process.hrtime.bigint());
      requestRoutes.set(request, getRouteLabel(request));
      const requestsMetric = await getTotalRequestsMetric();
      requestsMetric?.increment();
    },
    onAfterHandle: async ({ request, response, set }: AfterHandleHookContext): Promise<void> => {
      const route = getRouteLabel(request);
      const statusCode = getStatusCode(response, set.status);
      const responseMetric = await getResponseStatusMetric();
      responseMetric?.increment(route, statusCode);

      const startedAt = requestStartTimes.get(request);
      requestStartTimes.delete(request);
      requestRoutes.delete(request);
      if (!startedAt) return;

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const responseTimeHistogramMetric = await getResponseTimeMetric();
      responseTimeHistogramMetric?.observe(route, durationMs);
    },
  };
};
