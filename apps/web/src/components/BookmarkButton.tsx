"use client";

import { BookmarkResponse } from "@confy/shared/contracts";
import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { api, errorMessage } from "@/lib/api/client";
import { usePersona } from "@/lib/persona/PersonaProvider";

/**
 * A new demand event becomes searchable about 4.5 s after it's written (measured on Elasticsearch Serverless), so
 * the immediate refresh can still read the old forecast. Refresh again once the index has caught up, with a
 * second pass as a safety margin.
 */
const SETTLE_REFRESH_MS = [5500, 9000] as const;

/**
 * "I plan to go". Records interest with the api, which feeds the live demand forecast, then refreshes the
 * page so the "likely to fill up" panel reflects it straight away.
 */
export function BookmarkButton({ talkId, title }: { talkId: string; title: string }) {
  const { persona } = usePersona();
  const router = useRouter();
  const bookmarks = useBookmarks(persona.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = bookmarks.has(talkId);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  async function bookmark() {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/v1/talks/${encodeURIComponent(talkId)}/bookmark`, BookmarkResponse, undefined, { userId: persona.id });
      bookmarks.add(talkId);
      router.refresh();
      timers.current = SETTLE_REFRESH_MS.map((ms) => setTimeout(() => router.refresh(), ms));
    } catch (err) {
      setError(errorMessage(err, "We couldn't save that. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Button type="button" variant={done ? "secondary" : "outline"} size="sm" onClick={bookmark} disabled={busy || done} aria-pressed={done}>
        {busy ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : done ? <BookmarkCheck aria-hidden="true" /> : <Bookmark aria-hidden="true" />}
        {done ? "Bookmarked" : "I plan to go"}
        <span className="sr-only"> {title}</span>
      </Button>
      <span role="status" className="text-sm text-muted-foreground">
        {done && "Saved. The live crowd forecast will update in a few seconds."}
      </span>
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
