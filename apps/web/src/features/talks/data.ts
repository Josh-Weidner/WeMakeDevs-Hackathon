import { TalkResult } from "@confy/shared/contracts";
import { ApiRequestError, api } from "@/lib/api/client";

/** `null` when the talk doesn't exist; any other failure propagates to the route's error boundary. */
export async function fetchTalk(id: string): Promise<TalkResult | null> {
  try {
    return await api.get(`/v1/talks/${encodeURIComponent(id)}`, TalkResult);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}
