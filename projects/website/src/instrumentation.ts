import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { isProduction } from "@ssr/common/utils/utils";

export function register() {
  // Only run on server side
  if (typeof window !== "undefined") return;

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: "ssr-website",
      ["deployment.environment"]: isProduction() ? "production" : "development",
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: "https://signoz-injest.fascinated.cc/v1/traces",
          headers: {}, // Add any required headers here
        })
      ),
    ],
  });
  sdk.start();
}
