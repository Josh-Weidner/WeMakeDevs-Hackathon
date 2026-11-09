import {
  ROOT_CONTEXT,
  SpanStatusCode,
  context,
  propagation,
  trace,
  type Attributes,
  type Link,
} from "@opentelemetry/api";

const tracer = trace.getTracer("confy");

export interface SpanOptions {
  /** Causal links, e.g. the request span that enqueued a job. */
  links?: Link[];
}

/**
 * Wrap a business operation in a span named `confy.<domain>.<operation>`.
 * Attributes must be prefixed `confy.` and contain IDs/counts only (no PII, no user text).
 */
export async function withSpan<T>(
  name: `confy.${string}`,
  attributes: Attributes,
  fn: () => Promise<T>,
  options: SpanOptions = {},
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes, ...(options.links ? { links: options.links } : {}) }, async (span) => {
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

/** W3C `traceparent` of the active span: store it on a job so the worker can link back to the request. */
export function currentTraceparent(): string | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier.traceparent;
}

/** Span links for a stored `traceparent` (empty when absent or invalid). */
export function linksFromTraceparent(traceparent: string | undefined): Link[] {
  if (!traceparent) return [];
  const spanContext = trace.getSpanContext(propagation.extract(ROOT_CONTEXT, { traceparent }));
  return spanContext ? [{ context: spanContext }] : [];
}
