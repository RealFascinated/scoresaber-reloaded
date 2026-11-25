import { OpenTelemetry } from "@ai-sdk/otel";
import {
  context,
  createContextKey,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span,
} from "@opentelemetry/api";
import { logs, SeverityNumber, type AnyValueMap } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import {
  BatchSpanProcessor,
  BasicTracerProvider,
  type ReadableSpan,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { env } from "@ssr/common/env";
import Logger, { type LogLevel } from "@ssr/common/logger";
import { registerTelemetry } from "ai";
import { EnterableContextManager } from "./context-manager";

const SEVERITY: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

const TRACER_NAME = "ssr-backend";

const CHAT_SPAN_ATTRIBUTE = "gen_ai.conversation.id";

const CHAT_SESSION_KEY = createContextKey("ssr-chat-session");

type ChatSession = { conversationId: string; userId?: string };

const chatSessionProcessor = {
  onStart(span, parentContext) {
    const session = parentContext.getValue(CHAT_SESSION_KEY) as ChatSession | undefined;
    if (!session) {
      return;
    }
    span.setAttribute(CHAT_SPAN_ATTRIBUTE, session.conversationId);
    if (session.userId) {
      span.setAttribute("user.id", session.userId);
    }
  },
  onEnd() {},
  forceFlush: () => Promise.resolve(),
  shutdown: () => Promise.resolve(),
} satisfies SpanProcessor;

/** Tags every span started inside `fn` with the chat conversation and user so LLM traces group into sessions. */
export function withChatSession<T>(session: ChatSession, fn: () => T) {
  const current = context.active().getValue(CHAT_SESSION_KEY) as ChatSession | undefined;
  return context.with(context.active().setValue(CHAT_SESSION_KEY, { ...current, ...session }), fn);
}

function isChatSpan(span: ReadableSpan) {
  return span.attributes[CHAT_SPAN_ATTRIBUTE] !== undefined;
}

const TRACE_SAMPLE_RATIO = 0.1;
const SLOW_SPAN_THRESHOLD_MS = 100;

function isSampledTrace(traceId: string) {
  return Number.parseInt(traceId.slice(-8), 16) / 0x100000000 < TRACE_SAMPLE_RATIO;
}

function shouldExportSpan(span: ReadableSpan) {
  if (isChatSpan(span) || span.status.code === SpanStatusCode.ERROR) {
    return true;
  }
  const [seconds, nanos] = span.duration;
  return seconds * 1000 + nanos / 1e6 >= SLOW_SPAN_THRESHOLD_MS || isSampledTrace(span.spanContext().traceId);
}

class FilteredSpanProcessor implements SpanProcessor {
  constructor(
    private readonly inner: SpanProcessor,
    private readonly accepts: (span: ReadableSpan) => boolean
  ) {}

  onStart(...args: Parameters<SpanProcessor["onStart"]>) {
    this.inner.onStart(...args);
  }

  onEnd(span: ReadableSpan) {
    if (this.accepts(span)) {
      this.inner.onEnd(span);
    }
  }

  forceFlush() {
    return this.inner.forceFlush();
  }

  shutdown() {
    return this.inner.shutdown();
  }
}

let loggerProvider: LoggerProvider | undefined;
let tracerProvider: BasicTracerProvider | undefined;

function toAttributeValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return JSON.stringify(value, (_key, nested) => (typeof nested === "bigint" ? nested.toString() : nested));
}

/** Starts OTLP trace and log export. Does nothing unless `OTEL_EXPORTER_OTLP_ENDPOINT` is set. */
export function initTelemetry() {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    return;
  }

  context.setGlobalContextManager(new EnterableContextManager().enable());

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME ?? "ssr-backend",
    "deployment.environment.name": env.NEXT_PUBLIC_APP_ENV,
  });

  tracerProvider = new BasicTracerProvider({
    resource,
    spanProcessors: [
      chatSessionProcessor,
      ...(env.OTEL_CHAT_STREAM
        ? [
            new FilteredSpanProcessor(
              new BatchSpanProcessor(new OTLPTraceExporter()),
              span => !isChatSpan(span) && shouldExportSpan(span)
            ),
            new FilteredSpanProcessor(
              new BatchSpanProcessor(
                new OTLPTraceExporter({ headers: { "stream-name": env.OTEL_CHAT_STREAM } })
              ),
              isChatSpan
            ),
          ]
        : [new FilteredSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter()), shouldExportSpan)]),
    ],
  });
  trace.setGlobalTracerProvider(tracerProvider);
  registerTelemetry(new OpenTelemetry());

  loggerProvider = new LoggerProvider({
    resource,
    processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  const otelLogger = logs.getLogger(TRACER_NAME);
  Logger.addSink(record => {
    const attributes: AnyValueMap = {};
    for (const [key, value] of Object.entries(record.attributes)) {
      attributes[key] = toAttributeValue(value);
    }
    if (record.topic) {
      attributes.topic = record.topic;
    }
    if (record.error) {
      attributes["exception.type"] = record.error.name;
      attributes["exception.message"] = record.error.message;
      if (record.error.stack) {
        attributes["exception.stacktrace"] = record.error.stack;
      }
    }

    otelLogger.emit({
      timestamp: record.timestamp,
      severityNumber: SEVERITY[record.level],
      severityText: record.level.toUpperCase(),
      body: record.message,
      attributes,
      context: context.active(),
    });
  });
}

/** Flushes and stops the exporters. */
export async function shutdownTelemetry() {
  await Promise.all([tracerProvider?.shutdown(), loggerProvider?.shutdown()]);
}

/** Runs `fn` inside a span that is ended, and marked failed on throw, automatically. */
export async function withSpan<T>(name: string, fn: (span: Span) => Promise<T>, attributes?: Attributes) {
  const span = trace.getTracer(TRACER_NAME).startSpan(name, { kind: SpanKind.CLIENT, attributes });
  try {
    return await context.with(trace.setSpan(context.active(), span), () => fn(span));
  } catch (error) {
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}

/** Runs `fn` in its own root trace so work started by a request does not extend that request's trace. */
export async function withBackgroundSpan<T>(name: string, fn: () => Promise<T>) {
  const span = trace.getTracer(TRACER_NAME).startSpan(name, { kind: SpanKind.INTERNAL }, ROOT_CONTEXT);
  try {
    return await context.with(trace.setSpan(ROOT_CONTEXT, span), fn);
  } catch (error) {
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}

export { TRACER_NAME };
