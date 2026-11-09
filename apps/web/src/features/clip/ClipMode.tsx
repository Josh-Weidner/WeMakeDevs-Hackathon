"use client";

import { CLIP_AUDIO_TYPES, CLIP_MAX_BYTES, CLIP_MAX_SECONDS, ClipAccepted } from "@confy/shared/contracts";
import { CircleAlert, LoaderCircle, Mic, MicOff, ShieldCheck, Upload } from "lucide-react";
import { useCallback, useId, useState, type ChangeEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ApiRequestError, api } from "@/lib/api/client";
import { usePersona } from "@/lib/persona/PersonaProvider";
import { BUFFER_SECONDS, useClipRecorder } from "./useClipRecorder";
import { ClipCard, formatDuration } from "./ClipCard";
import { SHARE_QR_ID, ShareLinkedInQr } from "./ShareLinkedInQr";

interface SavedClip {
  id: string;
  seconds: number;
}

/**
 * Clip mode (SPEC §10b): a rolling 5 min buffer that stays on this device. Only "Save" uploads, and
 * only that slice. The api transcribes it in memory; the audio itself is never stored.
 */
export function ClipMode() {
  const { persona } = usePersona();
  const recorder = useClipRecorder();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clips, setClips] = useState<SavedClip[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const fileId = useId();
  const listening = recorder.state === "listening";

  const announce = useCallback((message: string) => setAnnouncement(message), []);

  async function send(blob: Blob, seconds: number) {
    setError(null);
    setSaving(true);
    announce(`Saving the last ${formatDuration(seconds)}…`);
    try {
      const accepted = await api.upload(`/v1/clips?durationS=${Math.min(seconds, CLIP_MAX_SECONDS)}`, ClipAccepted, blob, { userId: persona.id });
      setClips((prev) => [{ id: accepted.id, seconds }, ...prev]);
      announce("Clip saved and transcribed. Processing it now.");
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "We couldn't save the clip. Please try again.";
      setError(message);
      announce(message);
    } finally {
      setSaving(false);
    }
  }

  function save(wantSeconds: number) {
    const slice = recorder.take(wantSeconds);
    if (!slice) {
      setError("Nothing to save yet. Keep listening for a few seconds first.");
      return;
    }
    void send(slice.blob, slice.seconds);
  }

  async function uploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > CLIP_MAX_BYTES) {
      setError("That file is too large. Use a recording of 5 minutes or less.");
      return;
    }
    const seconds = await audioDuration(file);
    void send(file, Math.min(Math.max(seconds, 1), CLIP_MAX_SECONDS));
  }

  async function toggle() {
    if (listening) {
      recorder.stop();
      announce("Stopped listening. The buffer was cleared.");
    } else {
      await recorder.start();
    }
  }

  return (
    <div className="grid gap-8">
      <Alert>
        <ShieldCheck aria-hidden="true" />
        <AlertTitle>Nothing is kept unless you choose to keep it</AlertTitle>
        <AlertDescription>
          While listening, the last {BUFFER_SECONDS / 60} minutes of audio stay in this browser tab only. Nothing leaves your device until you tap
          Save, and then only that slice. We transcribe it and delete the audio straight away. Stopping clears the buffer. Ask before you record
          someone.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Save a moment</h2>
          </CardTitle>
          <CardDescription>Met someone? Heard something worth remembering? Save the last minute or five.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <Button type="button" size="lg" variant={listening ? "outline" : "default"} aria-pressed={listening} disabled={recorder.state === "starting"} onClick={() => void toggle()}>
              {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
              {listening ? "Stop listening" : recorder.state === "starting" ? "Starting…" : "Start listening"}
            </Button>
            <p className="flex items-center gap-2 text-sm" aria-live="off">
              {listening ? (
                <>
                  <span aria-hidden="true" className="inline-block size-2 rounded-full bg-red-600 motion-safe:animate-pulse" />
                  <span>
                    Listening: {formatDuration(recorder.seconds)} on this device (keeps up to {formatDuration(BUFFER_SECONDS)})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Not listening</span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Save from the buffer">
            <Button type="button" variant="secondary" disabled={!listening || saving} onClick={() => save(60)}>
              Save last 1 min
            </Button>
            <Button type="button" variant="secondary" disabled={!listening || saving} onClick={() => save(300)}>
              Save last 5 min
            </Button>
            {saving && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> Transcribing…
              </span>
            )}
          </div>

          {recorder.error && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Microphone unavailable</AlertTitle>
              <AlertDescription>
                {recorder.error}
                <a href={`#${SHARE_QR_ID}`} className="mt-1 block font-medium underline underline-offset-4">
                  Missed it? Share your LinkedIn QR instead
                </a>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>Clip not saved</AlertTitle>
              <AlertDescription>
                {error}
                <a href={`#${SHARE_QR_ID}`} className="mt-1 block font-medium underline underline-offset-4">
                  Missed it? Share your LinkedIn QR instead
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 border-t pt-6">
          <Label htmlFor={fileId} className="flex items-center gap-2">
            <Upload aria-hidden="true" className="size-4" /> Or upload a recording (up to 5 minutes)
          </Label>
          <input
            id={fileId}
            type="file"
            accept={CLIP_AUDIO_TYPES.join(",")}
            disabled={saving}
            onChange={(e) => void uploadFile(e)}
            className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />
        </CardFooter>
      </Card>

      <ShareLinkedInQr />

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {clips.length > 0 && (
        <section aria-labelledby="saved-clips" className="grid gap-4">
          <h2 id="saved-clips" className="text-lg font-semibold">
            Saved clips
          </h2>
          <ul className="grid gap-4">
            {clips.map((c) => (
              <li key={c.id}>
                <ClipCard id={c.id} userId={persona.id} seconds={c.seconds} onUpdate={announce} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Duration of an uploaded file, read locally by the browser (nothing is sent). */
function audioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(seconds) ? Math.round(seconds) : 60);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(60);
    audio.src = url;
  });
}
