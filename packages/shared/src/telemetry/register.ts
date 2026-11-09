/**
 * OpenTelemetry bootstrap. Must load BEFORE application code:
 *   node --import @confy/shared/telemetry/register dist/main.js
 *
 * Configured entirely through standard OTEL_* env vars:
 *   OTEL_SERVICE_NAME, OTEL_RESOURCE_ATTRIBUTES, OTEL_EXPORTER_OTLP_ENDPOINT,
 *   OTEL_EXPORTER_OTLP_HEADERS (Dash0 auth), OTEL_SDK_DISABLED=true to turn off.
 */
import { register } from "node:module";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace";

// Sensible defaults so local runs are labelled too; k8s overrides via OTEL_RESOURCE_ATTRIBUTES.
process.env.OTEL_RESOURCE_ATTRIBUTES ??= "service.namespace=confy,deployment.environment=local";

// ESM support: hook module loading so ESM imports (fastify, pino, ...) get instrumented.
register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

const sdk = new NodeSDK({
  spanProcessors: [new BatchSpanProcessor({ exporter: new OTLPTraceExporter() })],
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      exportIntervalMillis: 10_000,
    }),
  ],
  logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  instrumentations: [
    getNodeAutoInstrumentations({
      // fs spans are noise for us
      "@opentelemetry/instrumentation-fs": { enabled: false },
      // dns/net/tcp connect spans bury the business spans in the Dash0 trace view
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-net": { enabled: false },
    }),
  ],
});

if (process.env.OTEL_SDK_DISABLED !== "true") {
  sdk.start();

  const shutdown = () => {
    sdk.shutdown().catch(() => undefined);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
