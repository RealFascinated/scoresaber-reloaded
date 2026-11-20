import { context, SpanKind, SpanStatusCode, trace, type Span } from "@opentelemetry/api";
import Logger from "@ssr/common/logger";
import { Elysia } from "elysia";
import { TRACER_NAME } from "../telemetry/telemetry";

const log = Logger.withTopic("HTTP");

type RequestState = { span: Span; start: number };

/** Creates a server span per request and logs each request's method, path, status and duration. */
export const telemetry = () => {
  const states = new WeakMap<Request, RequestState>();

  return new Elysia({ name: "telemetry" })
    .onRequest(({ request }) => {
      const url = new URL(request.url);
      const span = trace.getTracer(TRACER_NAME).startSpan(
        `${request.method} ${url.pathname}`,
        {
          kind: SpanKind.SERVER,
          attributes: {
            "http.request.method": request.method,
            "url.path": url.pathname,
            "user_agent.original": request.headers.get("user-agent") ?? undefined,
          },
        },
        context.active()
      );
      states.set(request, { span, start: performance.now() });
    })
    .onError({ as: "global" }, ({ request, error }) => {
      const state = states.get(request);
      if (state) {
        state.span.recordException(error instanceof Error ? error : new Error(String(error)));
        state.span.setStatus({ code: SpanStatusCode.ERROR });
      }
    })
    .onAfterResponse({ as: "global" }, ({ request, route, set, responseValue }) => {
      const state = states.get(request);
      if (!state) {
        return;
      }
      states.delete(request);

      const status =
        typeof set.status === "number"
          ? set.status
          : responseValue instanceof Response
            ? responseValue.status
            : 200;
      const durationMs = Math.round(performance.now() - state.start);
      const path = new URL(request.url).pathname;

      state.span.setAttribute("http.response.status_code", status);
      if (route) {
        state.span.setAttribute("http.route", route);
        state.span.updateName(`${request.method} ${route}`);
      }
      if (status >= 500) {
        state.span.setStatus({ code: SpanStatusCode.ERROR });
      }
      state.span.end();

      log.debug(`${request.method} ${path} ${status}`, { status, durationMs, route });
    });
};
