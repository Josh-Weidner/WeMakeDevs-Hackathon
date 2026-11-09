import { z } from "zod";

/** Error envelope returned by every api error response. */
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** Header carrying the selected demo persona (no auth, by decision; see SPEC.md §13). */
export const USER_ID_HEADER = "x-user-id";
export const DEFAULT_DEMO_USER_ID = "demo-alex";

export const UserId = z
  .string()
  .regex(/^[a-z0-9-]{1,64}$/, "user id must be lowercase letters, digits, or dashes");

/** The demo persona switcher (no auth, by decision). IDs are also attendee ids in the seed. */
export const DEMO_PERSONAS = [
  { id: "demo-alex", name: "Alex Rivera", role: "Platform engineer, new to multi-tenancy" },
  { id: "demo-sam", name: "Sam Chen", role: "SRE who prefers a calmer day" },
  { id: "demo-priya", name: "Priya Kapoor", role: "Security engineer" },
  { id: "demo-jordan", name: "Jordan Hughes", role: "Engineering manager" },
] as const;
