import { createDemandRepository, createEsClient, loadEnv } from "@confy/shared";
import { z } from "zod";
import { generateDemandEvents } from "./demand.js";
import { generateSeed } from "./generate.js";

/** `pnpm seed:demand [--tipping]`: write demo demand events (timestamps relative to now) into the demand-events stream. */
const env = loadEnv(z.object({ ELASTICSEARCH_URL: z.string().url(), ELASTICSEARCH_API_KEY: z.string().min(1) }));
const client = createEsClient({ url: env.ELASTICSEARCH_URL, apiKey: env.ELASTICSEARCH_API_KEY, requestTimeoutMs: 60_000 });
try {
  const level = process.argv.includes("--tipping") ? "tipping" : "full";
  const events = generateDemandEvents(generateSeed(), new Date(), 7, level);
  await createDemandRepository(client).record(events);
  process.stdout.write(`${events.length} demand events written to demand-events (hot talk: ${level})\n`);
} finally {
  await client.close();
}
