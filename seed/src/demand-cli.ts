import { createDemandRepository, createEsClient, loadEnv } from "@confy/shared";
import { z } from "zod";
import { generateDemandEvents } from "./demand.js";
import { generateSeed } from "./generate.js";

/** `pnpm seed:demand`: write demo demand events (timestamps relative to now) into the demand-events stream. */
const env = loadEnv(z.object({ ELASTICSEARCH_URL: z.string().url(), ELASTICSEARCH_API_KEY: z.string().min(1) }));
const client = createEsClient({ url: env.ELASTICSEARCH_URL, apiKey: env.ELASTICSEARCH_API_KEY, requestTimeoutMs: 60_000 });
try {
  const events = generateDemandEvents(generateSeed(), new Date());
  await createDemandRepository(client).record(events);
  process.stdout.write(`${events.length} demand events written to demand-events\n`);
} finally {
  await client.close();
}
