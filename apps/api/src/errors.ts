import type { ApiError } from "@confy/shared/contracts";
import type { FastifyError, FastifyInstance } from "fastify";

/** Domain errors. Services throw these; only the error handler maps them to HTTP. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("validation_error", message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super("not_found", message, 404);
  }
}

/** An upstream dependency (Elasticsearch, OpenAI) failed. */
export class UpstreamError extends AppError {
  constructor(message: string) {
    super("upstream_error", message, 502);
  }
}

/** The single place where errors become HTTP responses. Never leaks stacks or upstream payloads. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | AppError, request, reply) => {
    if (err instanceof AppError) {
      if (err.statusCode >= 500) request.log.error({ err }, "request failed");
      const body: ApiError = { error: { code: err.code, message: err.message } };
      return reply.status(err.statusCode).send(body);
    }

    // Fastify's own validation / client errors (bad JSON, etc.)
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status >= 500) request.log.error({ err }, "unhandled error");
    const body: ApiError = {
      error: {
        code: status >= 500 ? "internal_error" : "bad_request",
        message: status >= 500 ? "Something went wrong" : err.message,
      },
    };
    return reply.status(status).send(body);
  });

  app.setNotFoundHandler((_request, reply) => {
    const body: ApiError = { error: { code: "not_found", message: "Route not found" } };
    return reply.status(404).send(body);
  });
}
