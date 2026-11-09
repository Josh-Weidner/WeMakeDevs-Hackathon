import { SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";

const tracer = trace.getTracer("confy");

/**
 * Wrap a business operation in a span named `confy.<domain>.<operation>`.
 * Attributes must be prefixed `confy.` and contain IDs/counts only (no PII, no user text).
 */
export async function withSpan<T>(
  name: `confy.${string}`,
  attributes: Attributes,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn();
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
