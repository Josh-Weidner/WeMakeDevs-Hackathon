import OpenAI, { toFile } from "openai";
import type { z } from "zod";

/** One place for embedding model + dims: indexing and querying must match. */
export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMS = 1536;
/** Chat model for short structured tasks (parsing, classification). Override with OPENAI_CHAT_MODEL. */
export const DEFAULT_CHAT_MODEL = "gpt-4.1-mini";
/** Speech-to-text for Clip mode. Override with OPENAI_TRANSCRIBE_MODEL. */
export const DEFAULT_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";
/** A 5 min clip takes longer than the default request timeout. */
const TRANSCRIBE_TIMEOUT_MS = 90_000;

const AUDIO_EXTENSIONS: Record<string, string> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
};

export interface AiClientOptions {
  apiKey: string;
  timeoutMs?: number;
  maxRetries?: number;
  chatModel?: string;
  transcribeModel?: string;
}

export interface ChatJsonOptions<S extends z.ZodType> {
  system: string;
  /** Untrusted user text. It goes in the user turn only, never into the system prompt. */
  user: string;
  /** The reply is parsed and validated against this schema; anything else throws. */
  schema: S;
}

export interface AiClient {
  embed(texts: string[]): Promise<number[][]>;
  /** One JSON-mode completion, validated with zod. Low temperature: these are extraction tasks. */
  chatJson<S extends z.ZodType>(options: ChatJsonOptions<S>): Promise<z.infer<S>>;
  /**
   * Speech-to-text. The audio is sent from memory and never written anywhere by Confy.
   * `mimeType` is the bare media type, e.g. "audio/wav".
   */
  transcribe(audio: Uint8Array, mimeType: string): Promise<string>;
  /** Escape hatch for anything without a dedicated wrapper yet. */
  raw: OpenAI;
}

export function createAiClient(options: AiClientOptions): AiClient {
  const openai = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? 15_000,
    maxRetries: options.maxRetries ?? 2,
  });

  const chatModel = options.chatModel ?? DEFAULT_CHAT_MODEL;
  const transcribeModel = options.transcribeModel ?? DEFAULT_TRANSCRIBE_MODEL;

  return {
    raw: openai,

    async chatJson({ system, user, schema }) {
      const res = await openai.chat.completions.create({
        model: chatModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const content = res.choices[0]?.message?.content;
      if (!content) throw new Error("chat completion returned no content");
      return schema.parse(JSON.parse(content));
    },

    async transcribe(audio, mimeType) {
      const ext = AUDIO_EXTENSIONS[mimeType];
      if (!ext) throw new Error(`unsupported audio type ${mimeType}`);
      const file = await toFile(audio, `clip.${ext}`, { type: mimeType });
      const res = await openai.audio.transcriptions.create(
        { file, model: transcribeModel, response_format: "text" },
        { timeout: TRANSCRIBE_TIMEOUT_MS },
      );
      return res.trim();
    },

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
