import { EMBED_KINDS, EMBEDDABLE, embedJobType, type AiClient, type EmbeddingStore } from "@confy/shared";
import { z } from "zod";
import type { JobHandler } from "../jobs.js";

const payload = z.object({ id: z.string().min(1) });

/**
 * `embed-<kind>` handlers: load the document, build its embedding text, embed it, write the vector back.
 * Idempotent: re-running overwrites the same field with the same vector.
 */
export function createEmbedHandlers(deps: { store: EmbeddingStore; ai: Pick<AiClient, "embed"> }): Record<string, JobHandler> {
  return Object.fromEntries(
    EMBED_KINDS.map((kind): [string, JobHandler] => [
      embedJobType(kind),
      async (job) => {
        const { id } = payload.parse(job.payload);
        const source = await deps.store.get(kind, id);
        if (!source) throw new Error(`${kind} "${id}" not found`);

        const [vector] = await deps.ai.embed([EMBEDDABLE[kind].text(source)]);
        if (!vector) throw new Error("embedding service returned no vector");
        await deps.store.setEmbedding(kind, id, vector);
      },
    ]),
  );
}
