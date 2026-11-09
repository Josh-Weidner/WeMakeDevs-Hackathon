/** "Rafael Costa" → "RC". Used for the avatar fallback; ignores extra spaces and punctuation. */
export function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] as string;
  const last = parts.length > 1 ? (parts[parts.length - 1] as string) : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** How a person prefers to meet, as plain text (shown with an icon, never by color alone). */
export function introPreferenceLabel(pref: "quiet" | "1:1"): string {
  return pref === "quiet" ? "Prefers a quiet setting" : "Happy to chat 1:1";
}

/** "Role · organization type", e.g. "Site Reliability Engineer · telco". */
export function subtitle(role: string, companyType: string): string {
  return `${role} · ${companyType}`;
}

/**
 * Re-checks a LinkedIn link before it becomes an href (defense in depth: the api already validates it).
 * Only https on linkedin.com; anything else, or anything malformed, yields null and no link is shown.
 */
export function safeLinkedInUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname;
    if (url.protocol !== "https:") return null;
    return host === "linkedin.com" || host.endsWith(".linkedin.com") ? url.toString() : null;
  } catch {
    return null;
  }
}
