import type { estypes } from "@elastic/elasticsearch";
import { EMBEDDING_DIMS } from "../ai/openai.js";

type Query = estypes.QueryDslQueryContainer;

/** kNN breadth: how many candidates each shard considers per returned hit. */
const KNN_CANDIDATE_FACTOR = 10;
const RRF_RANK_CONSTANT = 60;
/**
 * Minimum cosine similarity for a vector hit (≈ 0.68 on Elasticsearch's 0..1 score scale).
 * Measured on the seed: on-topic talks score ≥ 0.70, filler ≤ 0.66, and a nonsense query tops out
 * at 0.64. Without a cutoff, kNN always returns its top-k and pads results with unrelated talks.
 */
export const MIN_COSINE_SIMILARITY = 0.36;

const STOPWORDS = new Set(
  "a an and are as at be but by can do does for from how i if in is it its me my of on or our so that the their them then there these they this to us was we were what when where which who whom why will with would you your".split(" "),
);

/**
 * Keyword side only: drop filler words so a sentence like "how do I stop one team hogging the cluster"
 * matches on its content words instead of "the"/"in" appearing in every abstract. The vector side
 * keeps the full sentence. If nothing is left, keep the original text.
 */
export function toKeywordQuery(text: string): string {
  const kept = text.split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "")));
  return kept.length > 0 ? kept.join(" ") : text;
}

export interface HybridParams {
  /** Keyword text for the BM25 side. */
  text?: string | undefined;
  /** Query embedding for the vector side. Omit to fall back to keyword-only. */
  vector?: number[] | undefined;
  /** BM25 fields (with optional boosts). */
  fields: string[];
  /** `most_fields` sums scores across fields (a doc matching several fields wins); default `best_fields`. */
  matchType?: "best_fields" | "most_fields";
  /** Hard constraints: not scored, applied to BOTH sides so they can never be ranked around. */
  filter?: Query[];
  mustNot?: Query[];
  limit: number;
}

/**
 * Hybrid search: BM25 `multi_match` + `knn`, fused with reciprocal rank fusion.
 * Pure function: returns the request body so it can be unit-tested and snapshotted.
 * Degrades gracefully: no vector → keyword only; no text → vector only; neither → filtered browse.
 */
export function buildHybridQuery(p: HybridParams): estypes.SearchRequest {
  const filter = p.filter ?? [];
  const mustNot = p.mustNot ?? [];
  const bool: Query = { bool: { filter, must_not: mustNot } };

  const keyword: Query | undefined = p.text
    ? { bool: { must: [{ multi_match: { query: toKeywordQuery(p.text), fields: p.fields, type: p.matchType ?? "best_fields" } }], filter, must_not: mustNot } }
    : undefined;

  const knn =
    p.vector && p.vector.length === EMBEDDING_DIMS
      ? {
          field: "embedding",
          query_vector: p.vector,
          k: p.limit,
          num_candidates: Math.max(p.limit * KNN_CANDIDATE_FACTOR, 50),
          similarity: MIN_COSINE_SIMILARITY,
          filter: { bool: { filter, must_not: mustNot } } as Query,
        }
      : undefined;

  if (keyword && knn) {
    return {
      size: p.limit,
      retriever: {
        rrf: {
          retrievers: [{ standard: { query: keyword } }, { knn }],
          rank_window_size: Math.max(p.limit * 5, 50),
          rank_constant: RRF_RANK_CONSTANT,
        },
      },
    };
  }
  if (knn) return { size: p.limit, knn };
  if (keyword) return { size: p.limit, query: keyword };
  return { size: p.limit, query: bool };
}

/** `term` filters, skipping unset values. */
export const termFilters = (fields: Record<string, string | boolean | undefined>): Query[] =>
  Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([field, value]) => ({ term: { [field]: value as string | boolean } }));

/** Never return vectors to callers. */
export const NO_VECTORS: { excludes: string[] } = { excludes: ["embedding"] };
