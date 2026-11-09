/** Pure helpers for the per-persona list of bookmarked talk ids kept in the browser (the api records the demand). */
export const bookmarksKey = (personaId: string) => `confy:bookmarks:${personaId}`;

/** Parse the stored list defensively: anything that isn't a JSON array of strings is treated as "none". */
export function parseBookmarks(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Add an id once, keeping the order bookmarks were made in. */
export function addBookmark(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? [...ids] : [...ids, id];
}
