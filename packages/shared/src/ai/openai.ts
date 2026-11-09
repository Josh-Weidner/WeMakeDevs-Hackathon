import OpenAI from "openai";

/** One place for embedding model + dims: indexing and querying must match. */
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;

export interface AiClientOptions {
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface AiClient {
  embed(texts: string[]): Promise<number[][]>;
  /** Escape hatch for chat / speech-to-text until dedicated wrappers land. */
  raw: OpenAI;
}

export function createAiClient(options: AiClientOptions): AiClient {
  const openai = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? 15_000,
    maxRetries: options.maxRetries ?? 2,
  });

  return {
    raw: openai,
    async embed(texts) {
      if (texts.length === 0) return [];
      const res = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMS,
      });
      return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}
