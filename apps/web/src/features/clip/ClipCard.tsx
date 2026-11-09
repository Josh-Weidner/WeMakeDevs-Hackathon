"use client";

import { ClipStatusResponse, LINKEDIN_NOTE_MAX, type ClipView } from "@confy/shared/contracts";
import { BookOpen, CircleAlert, Copy, ExternalLink, FlaskConical, LoaderCircle, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";

const POLL_MS = 2000;
/** ~3 min: past this the worker is likely down (that's the chaos demo), so say so instead of spinning. */
const MAX_POLLS = 90;

export type ClipPhase = { phase: "processing" } | { phase: "failed"; message: string } | { phase: "done"; clip: ClipView };

/** Polls one saved clip until the worker finishes it, then shows a connection or a highlight. */
export function ClipCard({ id, userId, seconds, onUpdate }: { id: string; userId: string; seconds: number; onUpdate: (message: string) => void }) {
  const [state, setState] = useState<ClipPhase>({ phase: "processing" });

  useEffect(() => {
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();

    async function poll() {
      polls += 1;
      try {
        const res = await api.get(`/v1/clips/${id}`, ClipStatusResponse, { userId, signal: controller.signal });
        if (res.status === "done" && res.clip) {
          setState({ phase: "done", clip: res.clip });
          onUpdate(res.clip.kind === "connection" ? `Clip ready: new connection, ${res.clip.result.kind === "connection" ? res.clip.result.person.name : ""}.` : "Clip ready: highlight saved.");
          return;
        }
        if (res.status === "failed") {
          setState({ phase: "failed", message: "We couldn't process this clip. The transcript was not kept." });
          onUpdate("A clip could not be processed.");
          return;
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // Transient errors: keep polling until the budget runs out.
        void err;
      }
      if (polls >= MAX_POLLS) {
        setState({ phase: "failed", message: "This is taking longer than usual. Your clip is queued and will appear in Contacts or Highlights once it's processed." });
        return;
      }
      timer = setTimeout(() => void poll(), POLL_MS);
    }

    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, userId, onUpdate]);

  if (state.phase === "processing") {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            <h3>Processing {formatDuration(seconds)} clip…</h3>
          </CardTitle>
          <CardDescription>Transcribed. Working out whether it's a new connection or a highlight.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state.phase === "failed") {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>Clip not ready</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return state.clip.result.kind === "connection" ? <ConnectionCard clip={state.clip} onUpdate={onUpdate} /> : <HighlightCard clip={state.clip} />;
}

function ConnectionCard({ clip, onUpdate }: { clip: ClipView; onUpdate: (message: string) => void }) {
  const result = clip.result;
  if (result.kind !== "connection") throw new Error("not a connection");
  const [note, setNote] = useState(result.linkedin_note);
  const noteId = useId();
  const { name, role, company } = result.person;
  const subtitle = [role, company].filter(Boolean).join(" at ");

  async function copy() {
    try {
      await navigator.clipboard.writeText(note);
      onUpdate("LinkedIn note copied.");
    } catch {
      onUpdate("Couldn't copy. Select the note and copy it yourself.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <Badge variant="secondary" className="mb-2 w-fit gap-1">
          <UserPlus aria-hidden="true" className="size-3.5" /> New connection
        </Badge>
        <CardTitle>
          <h3>{name}</h3>
        </CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4">
        <p>{clip.summary}</p>
        <p className="text-sm text-muted-foreground">Saved to your contacts, so you can find {name.split(/\s+/)[0]} later by what you remember.</p>

        <div className="grid gap-2">
          <Label htmlFor={noteId}>LinkedIn note (a draft: edit it before you send it)</Label>
          <Textarea id={noteId} rows={4} maxLength={LINKEDIN_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={`${noteId}-count`} />
          <p id={`${noteId}-count`} className="text-sm text-muted-foreground">
            {note.length} of {LINKEDIN_NOTE_MAX} characters
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copy()}>
            <Copy aria-hidden="true" /> Copy note
          </Button>
          <Button asChild>
            <a href={result.linkedin_search_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" /> Find {name} on LinkedIn
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Confy never contacts anyone on LinkedIn for you. You choose whether to send the note.</p>
        <Transcript text={clip.transcript} />
      </CardContent>
    </Card>
  );
}

function HighlightCard({ clip }: { clip: ClipView }) {
  const result = clip.result;
  if (result.kind !== "highlight") throw new Error("not a highlight");
  return (
    <Card>
      <CardHeader>
        <Badge variant="secondary" className="mb-2 w-fit gap-1">
          <Sparkles aria-hidden="true" className="size-3.5" /> Highlight
        </Badge>
        <CardTitle>
          <h3>{clip.summary}</h3>
        </CardTitle>
        {result.topic_tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Topics">
            {result.topic_tags.map((tag) => (
              <li key={tag}>
                <Badge variant="outline">{tag}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardHeader>
      <CardContent className="grid gap-5">
        {result.experiment && (
          <section aria-labelledby={`exp-${clip.id}`} className="grid gap-2">
            <h4 id={`exp-${clip.id}`} className="flex items-center gap-2 font-medium">
              <FlaskConical aria-hidden="true" className="size-4" /> Try it yourself
            </h4>
            <pre className="rounded-lg border bg-muted p-3 text-sm break-words whitespace-pre-wrap">
              <code>{result.experiment}</code>
            </pre>
          </section>
        )}

        {result.resources.length > 0 && (
          <section aria-labelledby={`res-${clip.id}`} className="grid gap-2">
            <h4 id={`res-${clip.id}`} className="flex items-center gap-2 font-medium">
              <BookOpen aria-hidden="true" className="size-4" /> Related talks and resources
            </h4>
            <ul className="grid gap-2">
              {result.resources.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{r.type === "talk" ? "Talk" : r.type === "repo" ? "Repo" : "Doc"}</Badge>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                      {r.title}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span>{r.title}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
        <Transcript text={clip.transcript} />
      </CardContent>
    </Card>
  );
}

function Transcript({ text }: { text: string }) {
  return (
    <details className="rounded-lg border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Transcript</summary>
      <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{text}</p>
    </details>
  );
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
