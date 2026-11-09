import type { z } from "zod";
import { ValidationError } from "../errors.js";

/** Validate untrusted input against a contract schema; failures become a 400 via the error handler. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
  }
  return result.data;
}
