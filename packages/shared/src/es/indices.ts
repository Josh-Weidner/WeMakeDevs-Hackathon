/**
 * Index aliases. Application code reads/writes ALIASES only; the versioned
 * concrete index (e.g. `talks_v1`) is managed by the es:setup script.
 */
export const INDEX = {
  talks: "talks",
  speakers: "speakers",
  rooms: "rooms",
  attendees: "attendees",
  contacts: "contacts",
  intros: "intros",
  clips: "clips",
  highlights: "highlights",
  resources: "resources",
  jobs: "jobs",
  demandEvents: "demand-events",
} as const;

export type IndexAlias = (typeof INDEX)[keyof typeof INDEX];

/** Indices holding per-user private data: every query MUST filter on owner_id. */
export const PRIVATE_INDICES: readonly IndexAlias[] = [INDEX.contacts, INDEX.clips, INDEX.highlights];

export function versionedIndexName(alias: IndexAlias, version: number): string {
  return `${alias}_v${version}`;
}
