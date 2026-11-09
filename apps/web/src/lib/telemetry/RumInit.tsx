"use client";

import { init } from "@dash0/sdk-web";
import { useEffect } from "react";

let started = false;

/**
 * Browser RUM (Dash0 website monitoring): page views, web vitals, errors, and fetch spans.
 * Requests to the same-origin /api/proxy automatically carry `traceparent`, so a browser
 * interaction joins the api → OpenAI → Elasticsearch trace. Renders nothing.
 */
export function RumInit({ endpoint, authToken }: { endpoint: string; authToken: string }) {
  useEffect(() => {
    if (started) return;
    started = true;
    init({ serviceName: "confy-web", endpoint: { url: endpoint, authToken } });
  }, [endpoint, authToken]);

  return null;
}
