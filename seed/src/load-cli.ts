import { createEsClient, createJobsRepository, loadEnv } from "@confy/shared";
import { z } from "zod";
import { generateSeed } from "./generate.js";
import { loadSeed } from "./load.js";

/** `pnpm seed:load`: generate the seed in memory and bulk-index it into Elasticsearch, then enqueue embedding jobs (`--no-jobs` to skip). */
const env = loadEnv(z.object({ ELASTICSEARCH_URL: z.string().url(), ELASTICSEARCH_API_KEY: z.string().min(1) }));
const client = createEsClient({ url: env.ELASTICSEARCH_URL, apiKey: env.ELASTICSEARCH_API_KEY, requestTimeoutMs: 60_000 });
try {
  const skipJobs = process.argv.includes("--no-jobs");
  for (const r of await loadSeed(client, generateSeed(), skipJobs ? undefined : createJobsRepository(client))) {
    process.stdout.write(`${String(r.indexed).padStart(4)}  ${r.index}${r.queued ? `  (+${r.queued} embed jobs)` : ""}\n`);
  }
} finally {
  await client.close();
}
