import { ApiError, DEFAULT_DEMO_USER_ID, USER_ID_HEADER } from "@confy/shared/contracts";
import type { z } from "zod";
import { apiBaseUrl } from "./config";

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

interface RequestOptions {
  userId?: string;
  signal?: AbortSignal;
}

/**
 * The ONLY way web talks to the api. Every response is validated against the
 * shared contract schema, so frontend/backend drift fails loudly.
 */
async function request<S extends z.ZodType>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: `/${string}`,
  schema: S,
  body: unknown,
  options: RequestOptions = {},
): Promise<z.infer<S>> {
  const res = await fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers: {
      accept: "application/json",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      [USER_ID_HEADER]: options.userId ?? DEFAULT_DEMO_USER_ID,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: options.signal,
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = ApiError.safeParse(json);
    throw new ApiRequestError(
      res.status,
      parsed.success ? parsed.data.error.code : "http_error",
      parsed.success ? parsed.data.error.message : `Request failed (${res.status})`,
    );
  }
  return schema.parse(json);
}

export const api = {
  get: <S extends z.ZodType>(path: `/${string}`, schema: S, options?: RequestOptions) =>
    request("GET", path, schema, undefined, options),
  post: <S extends z.ZodType>(path: `/${string}`, schema: S, body: unknown, options?: RequestOptions) =>
    request("POST", path, schema, body, options),
};
