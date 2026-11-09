import { z } from "zod";
import { loadEnv } from "../config/env.js";
import { createEsClient } from "./client.js";
import { setupIndices } from "./setup.js";

/** `pnpm es:setup [--dry-run]`: create/update every Confy index, alias and data stream. */
const env = loadEnv(z.object({ ELASTICSEARCH_URL: z.string().url(), ELASTICSEARCH_API_KEY: z.string().min(1) }));
const dryRun = process.argv.includes("--dry-run");

const client = createEsClient({ url: env.ELASTICSEARCH_URL, apiKey: env.ELASTICSEARCH_API_KEY });
try {
  const results = await setupIndices(client, { dryRun });
  for (const r of results) process.stdout.write(`${dryRun ? "[dry-run] " : ""}${r.action.padEnd(9)} ${r.name}\n`);
} finally {
  await client.close();
}
