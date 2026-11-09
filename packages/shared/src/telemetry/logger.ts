import { pino, type Logger } from "pino";

/**
 * Structured JSON logger. The OTel pino instrumentation injects trace_id/span_id
 * and forwards records to Dash0. Never log secrets, transcripts, notes, or names.
 */
export function createLogger(service: string, level = "info"): Logger {
  return pino({
    name: service,
    level,
    redact: {
      paths: ["req.headers.authorization", "*.apiKey", "*.api_key", "*.password", "*.token"],
      censor: "[redacted]",
    },
  });
}

export type { Logger } from "pino";
