import { SpanKind, SpanStatusCode, trace, type Span, type Attributes } from "@opentelemetry/api";
import Redis from "ioredis";
import type { Pool } from "pg";
import { TRACER_NAME, withSpan } from "./telemetry";

export const SUPERSEDED_REASON = "scoresaber-request-superseded";

function endSpan(span: Span, error?: Error) {
  if (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
  }
  span.end();
}

function toError(value: unknown) {
  return value instanceof Error ? value : new Error(String(value));
}

/** Wraps `globalThis.fetch` so every outgoing request gets a client span. */
export function instrumentFetch() {
  const originalFetch = globalThis.fetch;

  const tracedFetch = (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? String(input));
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    const span = trace.getTracer(TRACER_NAME).startSpan(`${method} ${url.host}`, {
      kind: SpanKind.CLIENT,
      attributes: { "http.request.method": method, "server.address": url.host, "url.path": url.pathname },
    });

    return originalFetch(input, init).then(
      response => {
        span.setAttribute("http.response.status_code", response.status);
        endSpan(span, response.status >= 500 ? new Error(`HTTP ${response.status}`) : undefined);
        return response;
      },
      (error: unknown) => {
        const signal = init?.signal ?? request?.signal;
        if (signal?.aborted && signal.reason === SUPERSEDED_REASON) {
          span.setAttribute("http.request.superseded", true);
          endSpan(span);
        } else {
          endSpan(span, toError(error));
        }
        throw error;
      }
    );
  };

  globalThis.fetch = Object.assign(tracedFetch, originalFetch) as typeof fetch;
}

/** Wraps `pool.query` so every Postgres query gets a client span. */
export function instrumentPool(pool: Pool) {
  const originalQuery = pool.query.bind(pool) as (...args: unknown[]) => unknown;

  const tracedQuery = (...args: unknown[]) => {
    if (typeof args[args.length - 1] === "function") {
      return originalQuery(...args);
    }

    const config = args[0];
    const statement = typeof config === "string" ? config : (config as { text?: string }).text;
    const attributes: Attributes = { "db.system.name": "postgresql", "db.query.text": statement };

    return withSpan("pg.query", () => originalQuery(...args) as Promise<unknown>, attributes);
  };

  pool.query = tracedQuery as unknown as typeof pool.query;
}

/** Wraps `Redis.prototype.sendCommand` so every Redis command gets a client span. */
export function instrumentRedis() {
  const originalSendCommand = Redis.prototype.sendCommand;

  Redis.prototype.sendCommand = function (
    this: Redis,
    command: Parameters<typeof originalSendCommand>[0],
    stream?: Parameters<typeof originalSendCommand>[1]
  ) {
    const span = trace.getTracer(TRACER_NAME).startSpan(`redis ${command.name}`, {
      kind: SpanKind.CLIENT,
      attributes: { "db.system.name": "redis", "db.operation.name": command.name },
    });
    const result = originalSendCommand.call(this, command, stream);
    command.promise.then(
      () => endSpan(span),
      (error: unknown) => endSpan(span, toError(error))
    );
    return result;
  } as typeof originalSendCommand;
}
