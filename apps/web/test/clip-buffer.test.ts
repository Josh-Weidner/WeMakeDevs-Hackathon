import { describe, expect, it } from "vitest";
import { RollingPcmBuffer, encodeWav } from "../src/lib/audio/clip-buffer";

const ones = (n: number) => new Float32Array(n).fill(0.5);

describe("RollingPcmBuffer", () => {
  it("keeps only the most recent maxSeconds", () => {
    const buf = new RollingPcmBuffer(2, 10); // 2 s at 10 Hz = 20 samples
    for (let i = 0; i < 5; i++) buf.push(Float32Array.from({ length: 10 }, () => i / 10));
    expect(buf.seconds).toBe(2);
    const last = buf.last(10);
    expect(last).toHaveLength(20);
    // The oldest three seconds (values 0, .1, .2) were dropped.
    expect(Math.round((last[0]! / 0x7fff) * 10)).toBe(3);
    expect(Math.round((last[19]! / 0x7fff) * 10)).toBe(4);
  });

  it("returns only what's buffered when asked for more", () => {
    const buf = new RollingPcmBuffer(300, 10);
    buf.push(ones(15));
    expect(buf.last(60)).toHaveLength(15);
  });

  it("resamples device-rate input down to the buffer rate", () => {
    const buf = new RollingPcmBuffer(10, 16_000);
    buf.push(ones(48_000), 48_000); // 1 s at 48 kHz
    expect(buf.seconds).toBeCloseTo(1, 2);
  });

  it("clears on stop, so nothing lingers", () => {
    const buf = new RollingPcmBuffer(10, 10);
    buf.push(ones(50));
    buf.clear();
    expect(buf.seconds).toBe(0);
    expect(buf.last(10)).toHaveLength(0);
  });
});

describe("encodeWav", () => {
  it("writes a mono 16-bit PCM WAV header", async () => {
    const blob = encodeWav(new Int16Array(16_000), 16_000);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + 32_000);
    const v = new DataView(await blob.arrayBuffer());
    const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(v.getUint16(22, true)).toBe(1); // mono
    expect(v.getUint32(24, true)).toBe(16_000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(32_000);
  });
});
