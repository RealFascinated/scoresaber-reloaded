import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { isProduction } from "@ssr/common/utils/utils";

export function register() {
  console.log("NEXT_RUNTIME", process.env.NEXT_RUNTIME);
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const sdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: "ssr-website",
        ["deployment.environment"]: isProduction() ? "production" : "development",
      }),
      spanProcessor: new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: "https://signoz-injest.fascinated.cc/v1/traces",
        })
      ),
    });
    sdk.start();
  }
}
