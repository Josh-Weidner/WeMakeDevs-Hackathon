import { createEsClient, loadEnv } from "@confy/shared";
import { z } from "zod";
import { generateSeed } from "./generate.js";
import { loadSeed } from "./load.js";

/** `pnpm seed:load`: generate the seed in memory and bulk-index it into Elasticsearch. */
const env = loadEnv(z.object({ ELASTICSEARCH_URL: z.string().url(), ELASTICSEARCH_API_KEY: z.string().min(1) }));
const client = createEsClient({ url: env.ELASTICSEARCH_URL, apiKey: env.ELASTICSEARCH_API_KEY, requestTimeoutMs: 60_000 });
try {
  for (const r of await loadSeed(client, generateSeed())) {
    process.stdout.write(`${String(r.indexed).padStart(4)}  ${r.index}\n`);
  }
} finally {
  await client.close();
}
