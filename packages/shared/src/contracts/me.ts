import { z } from "zod";
import { UserId } from "./common.js";
import { LinkedInUrl } from "./documents.js";

export const MeResponse = z.object({
  userId: UserId,
  /** From the persona's attendee profile, when there is one. */
  displayName: z.string().optional(),
  /** Only when the persona opted in to sharing it. Powers the "share your LinkedIn" QR code. */
  linkedinUrl: LinkedInUrl.optional(),
});
export type MeResponse = z.infer<typeof MeResponse>;
