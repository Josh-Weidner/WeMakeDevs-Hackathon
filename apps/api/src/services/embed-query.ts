import { withSpan, type AiClient, type Logger } from "@confy/shared";

/**
 * Embeds a user's search text for the vector half of hybrid search.
 * If the embedding service fails, search degrades to keyword-only instead of failing the request.
 * The text itself is never logged (user input).
 */
export async function embedQuery(
  ai: Pick<AiClient, "embed">,
  logger: Logger,
  text: string | undefined,
): Promise<number[] | undefined> {
  if (!text) return undefined;
  try {
    const [vector] = await withSpan("confy.ai.embed_query", {}, () => ai.embed([text]));
    return vector;
  } catch (err) {
    logger.warn({ err }, "query embedding failed; falling back to keyword search");
    return undefined;
  }
}
