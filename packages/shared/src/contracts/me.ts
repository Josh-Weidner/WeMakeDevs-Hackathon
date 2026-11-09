import { z } from "zod";
import { UserId } from "./common.js";

export const MeResponse = z.object({
  userId: UserId,
});
export type MeResponse = z.infer<typeof MeResponse>;
