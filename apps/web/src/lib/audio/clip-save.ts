import { CLIP_MAX_SECONDS } from "@confy/shared/contracts";

export interface ClipSavePlan {
  /** Seconds that will actually be uploaded (and sent as `durationS`). */
  seconds: number;
  /** True when less audio was buffered than the button asked for. */
  partial: boolean;
}

/**
 * "Save last 1 min / 5 min" never needs a full buffer: if you've only been listening for 10 s, it saves
 * those 10 s. Null when there's nothing to save yet (under 1 s, which the api's `durationS` rejects).
 */
export function planClipSave(wantSeconds: number, bufferedSeconds: number): ClipSavePlan | null {
  const available = Math.floor(Math.max(0, bufferedSeconds));
  if (available < 1) return null;
  const seconds = Math.min(wantSeconds, available, CLIP_MAX_SECONDS);
  return { seconds, partial: seconds < wantSeconds };
}
