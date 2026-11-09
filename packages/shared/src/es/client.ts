import { Client } from "@elastic/elasticsearch";

export interface EsClientOptions {
  url: string;
  apiKey: string;
  requestTimeoutMs?: number;
  maxRetries?: number;
}

/**
 * Single factory for the Elasticsearch client (Elastic Cloud Serverless).
 * The client emits OpenTelemetry spans natively, so ES calls show up in Dash0 traces.
 */
export function createEsClient(options: EsClientOptions): Client {
  return new Client({
    node: options.url,
    auth: { apiKey: options.apiKey },
    requestTimeout: options.requestTimeoutMs ?? 10_000,
    maxRetries: options.maxRetries ?? 2,
  });
}

/** Readiness probe helper: true when the cluster answers. */
export async function isEsReachable(client: Client): Promise<boolean> {
  try {
    await client.info();
    return true;
  } catch {
    return false;
  }
}

export type { Client as EsClient } from "@elastic/elasticsearch";
