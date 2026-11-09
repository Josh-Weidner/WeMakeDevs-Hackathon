import { LinkedInUrl } from "@confy/shared/contracts";

/**
 * The profile the Clip page's "share your LinkedIn" QR points to while the demo runs (SPEC §10b).
 * Set NEXT_PUBLIC_SHARE_LINKEDIN_URL at build time to change it, or to "" to turn the default off.
 */
export const DEMO_SHARE_LINKEDIN_URL = "https://www.linkedin.com/in/josh-weidner/";

export function configuredShareUrl(env: string | undefined = process.env.NEXT_PUBLIC_SHARE_LINKEDIN_URL): string | undefined {
  return parseLinkedInUrl(env ?? DEMO_SHARE_LINKEDIN_URL) ?? undefined;
}

/** A trimmed https linkedin.com URL, or null. Never throws. */
export function parseLinkedInUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = LinkedInUrl.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
}

export type ShareSource = "device" | "configured" | "profile";

/** Which URL the QR shows: one the user pasted on this device, then the demo default, then their opt-in profile URL. */
export function resolveShareUrl(input: { stored?: string | null; configured?: string | null; profile?: string | null }): { url: string; source: ShareSource } | null {
  const stored = parseLinkedInUrl(input.stored);
  if (stored) return { url: stored, source: "device" };
  const configured = parseLinkedInUrl(input.configured);
  if (configured) return { url: configured, source: "configured" };
  const profile = parseLinkedInUrl(input.profile);
  if (profile) return { url: profile, source: "profile" };
  return null;
}

export const shareStorageKey = (personaId: string) => `confy.linkedin.${personaId}`;
