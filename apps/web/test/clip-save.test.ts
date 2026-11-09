import { describe, expect, it } from "vitest";
import { CLIP_SAMPLE_RATE, RollingPcmBuffer, encodeWav } from "../src/lib/audio/clip-buffer";
import { planClipSave } from "../src/lib/audio/clip-save";

describe("planClipSave", () => {
  it("saves what's available when there's less than the button asks for", () => {
    expect(planClipSave(60, 10.4)).toEqual({ seconds: 10, partial: true });
    expect(planClipSave(300, 42)).toEqual({ seconds: 42, partial: true });
  });

  it("saves the full window once enough is buffered", () => {
    expect(planClipSave(60, 300)).toEqual({ seconds: 60, partial: false });
    expect(planClipSave(300, 300)).toEqual({ seconds: 300, partial: false });
  });

  it("returns nothing to save under one second", () => {
    expect(planClipSave(60, 0)).toBeNull();
    expect(planClipSave(60, 0.6)).toBeNull();
  });

  it("matches what the buffer hands back for upload after 10 s of listening", async () => {
    const buf = new RollingPcmBuffer(300);
    buf.push(new Float32Array(CLIP_SAMPLE_RATE * 10).fill(0.25));
    const plan = planClipSave(60, buf.seconds)!;
    const samples = buf.last(plan.seconds);
    expect(samples).toHaveLength(CLIP_SAMPLE_RATE * 10);
    const wav = encodeWav(samples);
    expect(wav.size).toBe(44 + CLIP_SAMPLE_RATE * 10 * 2);
    expect(wav.type).toBe("audio/wav");
  });
});
