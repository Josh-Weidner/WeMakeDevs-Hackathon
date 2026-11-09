import type { estypes } from "@elastic/elasticsearch";
import { EMBEDDING_DIMS } from "../../ai/openai.js";

type Property = estypes.MappingProperty;

/** Full-text field that can also be sorted/aggregated/filtered exactly via `<field>.keyword`. */
export const textWithKeyword = (): Property => ({
  type: "text",
  fields: { keyword: { type: "keyword", ignore_above: 256 } },
});

/** Title-like field: full text, exact `.keyword`, and `.suggest` for as-you-type autocomplete. */
export const titleField = (): Property => ({
  type: "text",
  fields: {
    keyword: { type: "keyword", ignore_above: 256 },
    suggest: { type: "search_as_you_type" },
  },
});

export const text = (): Property => ({ type: "text" });
export const keyword = (): Property => ({ type: "keyword" });
export const bool = (): Property => ({ type: "boolean" });
export const integer = (): Property => ({ type: "integer" });
export const date = (): Property => ({ type: "date" });

/** Returned in `_source` only: never searched, filtered, sorted, or aggregated. */
export const storedOnlyKeyword = (): Property => ({ type: "keyword", index: false, doc_values: false });

/** OpenAI text-embedding-3-small vectors, cosine similarity. Dims come from one constant. */
export const embedding = (): Property => ({
  type: "dense_vector",
  dims: EMBEDDING_DIMS,
  index: true,
  similarity: "cosine",
});
