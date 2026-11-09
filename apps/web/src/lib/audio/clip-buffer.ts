/**
 * Clip mode's on-device audio buffer (SPEC §10b). Raw mono PCM at 16 kHz, kept in memory only.
 * Old audio falls off the front, so the buffer never holds more than `maxSeconds`.
 *
 * Why raw PCM and not MediaRecorder chunks: a WebM/Ogg recording has its header only in the first
 * chunk, so dropping old chunks from a rolling buffer produces a file nobody can decode.
 */
export const CLIP_SAMPLE_RATE = 16_000;

export class RollingPcmBuffer {
  private chunks: Int16Array[] = [];
  private total = 0;
  /** Carries the fractional sample position between `push` calls when resampling. */
  private phase = 0;

  constructor(
    private readonly maxSeconds: number,
    private readonly sampleRate = CLIP_SAMPLE_RATE,
  ) {}

  /** Seconds of audio currently held. */
  get seconds(): number {
    return this.total / this.sampleRate;
  }

  /** Append float samples captured at `inputRate`, resampling to the buffer's rate. */
  push(input: Float32Array, inputRate: number = this.sampleRate): void {
    const chunk = resampleToInt16(input, inputRate / this.sampleRate, this.phase);
    this.phase = chunk.phase;
    if (chunk.samples.length === 0) return;
    this.chunks.push(chunk.samples);
    this.total += chunk.samples.length;
    this.trim();
  }

  /** The most recent `seconds` of audio (or everything held, if less). */
  last(seconds: number): Int16Array {
    const want = Math.min(this.total, Math.round(seconds * this.sampleRate));
    const out = new Int16Array(want);
    let offset = want;
    for (let i = this.chunks.length - 1; i >= 0 && offset > 0; i--) {
      const chunk = this.chunks[i]!;
      const take = Math.min(chunk.length, offset);
      out.set(chunk.subarray(chunk.length - take), offset - take);
      offset -= take;
    }
    return out;
  }

  /** Forget everything (used when the user stops listening). */
  clear(): void {
    this.chunks = [];
    this.total = 0;
    this.phase = 0;
  }

  private trim(): void {
    const max = Math.round(this.maxSeconds * this.sampleRate);
    while (this.total > max && this.chunks.length > 0) {
      const head = this.chunks[0]!;
      const excess = this.total - max;
      if (head.length <= excess) {
        this.chunks.shift();
        this.total -= head.length;
      } else {
        this.chunks[0] = head.subarray(excess);
        this.total -= excess;
      }
    }
  }
}

/** Box-filter resampling (averages each output window) plus float → 16-bit conversion. */
function resampleToInt16(input: Float32Array, ratio: number, phase: number): { samples: Int16Array; phase: number } {
  if (ratio <= 1) return { samples: floatToInt16(input), phase: 0 };
  const out: number[] = [];
  let pos = phase;
  while (pos + ratio <= input.length) {
    const start = Math.floor(pos);
    const end = Math.floor(pos + ratio);
    let sum = 0;
    for (let i = start; i < end; i++) sum += input[i]!;
    out.push(sum / Math.max(end - start, 1));
    pos += ratio;
  }
  return { samples: floatToInt16(Float32Array.from(out)), phase: pos - input.length };
}

function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** A standard 44-byte-header PCM WAV file (mono, 16-bit). */
export function encodeWav(samples: Int16Array, sampleRate = CLIP_SAMPLE_RATE): Blob {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const ascii = (offset: number, s: string) => [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  const dataBytes = samples.length * 2;
  ascii(0, "RIFF");
  v.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true); // fmt chunk size
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // byte rate
  v.setUint16(32, 2, true); // block align
  v.setUint16(34, 16, true); // bits per sample
  ascii(36, "data");
  v.setUint32(40, dataBytes, true);
  // Copy so the Blob owns a plain ArrayBuffer of exactly the samples.
  return new Blob([header, samples.slice().buffer], { type: "audio/wav" });
}
