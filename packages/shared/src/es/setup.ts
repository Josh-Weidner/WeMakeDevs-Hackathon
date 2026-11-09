import type { EsClient } from "./client.js";
import { INDEX, versionedIndexName, type IndexAlias } from "./indices.js";
import { DEMAND_EVENTS_MAPPINGS, MAPPINGS } from "./mappings/index.js";

export const INITIAL_VERSION = 1;

export type SetupAction = "created" | "updated" | "unchanged";

export interface SetupResult {
  name: string;
  action: SetupAction;
}

export interface SetupOptions {
  /** Report what would happen without writing anything. */
  dryRun?: boolean;
}

/**
 * Idempotent: safe to run on every deploy.
 * - Missing index  → create `<alias>_v1` and point the alias at it.
 * - Existing index → apply the mapping additively (new fields are allowed in place).
 *   A changed field TYPE is rejected by Elasticsearch; that needs a new `_vN` index + reindex.
 */
export async function setupIndices(client: EsClient, options: SetupOptions = {}): Promise<SetupResult[]> {
  const results: SetupResult[] = [];

  for (const [alias, mappings] of Object.entries(MAPPINGS) as Array<[IndexAlias, (typeof MAPPINGS)[keyof typeof MAPPINGS]]>) {
    const exists = await client.indices.existsAlias({ name: alias });
    if (!exists) {
      if (!options.dryRun) {
        await client.indices.create({
          index: versionedIndexName(alias, INITIAL_VERSION),
          aliases: { [alias]: {} },
          mappings,
        });
      }
      results.push({ name: alias, action: "created" });
      continue;
    }
    if (!options.dryRun) await client.indices.putMapping({ index: alias, ...mappings });
    results.push({ name: alias, action: "updated" });
  }

  results.push(await setupDemandEvents(client, options));
  return results;
}

async function setupDemandEvents(client: EsClient, options: SetupOptions): Promise<SetupResult> {
  const name = INDEX.demandEvents;
  const streamExists = await dataStreamExists(client, name);
  if (!options.dryRun) {
    await client.indices.putIndexTemplate({
      name,
      index_patterns: [name],
      data_stream: {},
      priority: 200,
      template: { mappings: DEMAND_EVENTS_MAPPINGS },
    });
    if (!streamExists) await client.indices.createDataStream({ name });
  }
  return { name, action: streamExists ? "updated" : "created" };
}

async function dataStreamExists(client: EsClient, name: string): Promise<boolean> {
  try {
    await client.indices.getDataStream({ name });
    return true;
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode === 404) return false;
    throw err;
  }
}
