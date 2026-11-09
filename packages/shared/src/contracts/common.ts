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
