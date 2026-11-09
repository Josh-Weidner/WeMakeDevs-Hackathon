"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { safeLinkedInUrl } from "@/lib/people/format";

/**
 * A drafted message (an opener, a follow-up) with the two ways to use it: copy it, or open the person's LinkedIn
 * and copy it in one click. Confy never contacts anyone; the user opens LinkedIn and sends any request themselves.
 */
export function DraftNote({
  label,
  text,
  name,
  linkedinUrl,
}: {
  label: string;
  text: string;
  /** Who it is for, used in accessible names and messages. */
  name: string;
  linkedinUrl: string | null | undefined;
}) {
  // "copied": written to the clipboard. "selected": the clipboard was blocked, so we selected the text for Ctrl/Cmd+C.
  const [feedback, setFeedback] = useState<"idle" | "copied" | "selected">("idle");
  const [viaLink, setViaLink] = useState(false);
  const noteText = useRef<HTMLQuoteElement>(null);
  const linkedin = safeLinkedInUrl(linkedinUrl);

  useEffect(() => {
    if (feedback === "idle") return;
    const timer = setTimeout(() => setFeedback("idle"), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function copy(fromLink: boolean) {
    setViaLink(fromLink);
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("copied");
    } catch {
      // The clipboard can be blocked (permissions, or a plain-http demo URL). Select the text so copying still works.
      if (noteText.current) window.getSelection()?.selectAllChildren(noteText.current);
      setFeedback("selected");
    }
  }

  return (
    <figure className="grid gap-3 rounded-xl border bg-muted/40 p-4">
      <figcaption className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</figcaption>
      <blockquote ref={noteText} className="text-sm leading-relaxed">
        {text}
      </blockquote>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {linkedin && (
          <Button asChild size="sm">
            {/* A real link: opens in a new tab with no referrer. The copy happens as the user clicks. */}
            <a href={linkedin} target="_blank" rel="noopener noreferrer" onClick={() => void copy(true)}>
              <ExternalLink aria-hidden="true" />
              Open LinkedIn and copy note
              <span className="sr-only"> for {name} (opens in a new tab)</span>
            </a>
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => void copy(false)}>
          {feedback === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {feedback === "copied" ? "Copied" : "Copy note"}
          <span className="sr-only"> for {name}</span>
        </Button>
        <span role="status" className="text-sm text-muted-foreground">
          {feedback === "copied" &&
            (viaLink ? "Note copied. On LinkedIn choose Connect, then Add a note, then paste." : `Note for ${name} copied.`)}
          {feedback === "selected" && "Text selected: press Ctrl+C (Cmd+C on Mac) to copy."}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {linkedin
          ? "Confy never contacts anyone for you. You open LinkedIn and send the request yourself."
          : `${name} hasn't shared a LinkedIn link, so copy the note and reach out another way.`}
      </p>
    </figure>
  );
}
