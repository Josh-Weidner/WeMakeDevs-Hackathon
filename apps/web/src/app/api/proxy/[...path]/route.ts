import { USER_ID_HEADER } from "@confy/shared/contracts";
import type { NextRequest } from "next/server";

/**
 * Same-origin proxy: browser → /api/proxy/v1/... → api service.
 * Forwards only what the api needs (method, body, content-type, persona, trace context).
 */
const FORWARDED_HEADERS = ["content-type", "accept", USER_ID_HEADER, "traceparent", "tracestate"];

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const base = process.env.API_BASE_URL ?? "http://localhost:4000";
  const target = new URL(`/${path.map(encodeURIComponent).join("/")}`, base);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    return Response.json({ error: { code: "upstream_error", message: "API unreachable" } }, { status: 502 });
  }
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export { forward as GET, forward as POST, forward as PUT, forward as DELETE };
