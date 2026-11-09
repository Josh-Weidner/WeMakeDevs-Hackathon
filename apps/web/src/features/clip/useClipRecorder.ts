"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIP_SAMPLE_RATE, RollingPcmBuffer, encodeWav } from "@/lib/audio/clip-buffer";
import { planClipSave } from "@/lib/audio/clip-save";

export const BUFFER_SECONDS = 300;

export type RecorderState = "idle" | "starting" | "listening" | "error";

interface Capture {
  stream: MediaStream;
  context: AudioContext;
  node: ScriptProcessorNode;
}

/**
 * Microphone → rolling 5 min buffer, all on the device. Nothing is uploaded here: `take()` only hands
 * back a WAV of the last N seconds when the user taps Save. Stopping discards the buffer.
 */
export function useClipRecorder() {
  const buffer = useRef(new RollingPcmBuffer(BUFFER_SECONDS));
  const capture = useRef<Capture | null>(null);
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    const c = capture.current;
    capture.current = null;
    if (c) {
      c.node.disconnect();
      c.stream.getTracks().forEach((t) => t.stop());
      void c.context.close();
    }
    buffer.current.clear();
    setSeconds(0);
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      // Ask for 16 kHz; some browsers only run at the device rate, so the buffer resamples either way.
      let context: AudioContext | null = null;
      let source: MediaStreamAudioSourceNode;
      try {
        context = new AudioContext({ sampleRate: CLIP_SAMPLE_RATE });
        source = context.createMediaStreamSource(stream);
      } catch {
        void context?.close();
        context = new AudioContext();
        source = context.createMediaStreamSource(stream);
      }
      const ctx = context;
      // ScriptProcessor is deprecated but universally supported and needs no separate worklet file.
      const node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (event) => buffer.current.push(event.inputBuffer.getChannelData(0), ctx.sampleRate);
      source.connect(node);
      node.connect(ctx.destination); // required for processing to run; the output is silence
      capture.current = { stream, context: ctx, node };
      setState("listening");
    } catch (err) {
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setError(denied ? "Microphone access was blocked. Allow it in your browser's site settings, or upload a recording instead." : "We couldn't start the microphone. You can upload a recording instead.");
      setState("error");
    }
  }, []);

  /**
   * WAV of the last `wantSeconds`, or of everything buffered if there's less (10 s of listening + "Save
   * last 1 min" saves those 10 s). Null when under a second is buffered.
   */
  const take = useCallback((wantSeconds: number): { blob: Blob; seconds: number; partial: boolean } | null => {
    const plan = planClipSave(wantSeconds, buffer.current.seconds);
    if (!plan) return null;
    return { blob: encodeWav(buffer.current.last(plan.seconds)), seconds: plan.seconds, partial: plan.partial };
  }, []);

  // Visible timer only (not a live region: announcing every second would be noise).
  useEffect(() => {
    if (state !== "listening") return;
    const timer = setInterval(() => setSeconds(Math.floor(buffer.current.seconds)), 1000);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => stop, [stop]);

  return { state, seconds, error, start, stop, take };
}
