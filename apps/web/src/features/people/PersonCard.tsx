"use client";

import type { PersonMatch } from "@confy/shared/contracts";
import { Check, Copy, MessageCircle, Moon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { initials, introPreferenceLabel, subtitle } from "@/lib/people/format";

/** One match: who they are, what you share, and a suggested way to start the conversation. */
export function PersonCard({ person }: { person: PersonMatch }) {
  // "copied": written to the clipboard. "selected": the clipboard was blocked, so we selected the text for Ctrl/Cmd+C.
  const [feedback, setFeedback] = useState<"idle" | "copied" | "selected">("idle");
  const openerText = useRef<HTMLQuoteElement>(null);

  useEffect(() => {
    if (feedback === "idle") return;
    const timer = setTimeout(() => setFeedback("idle"), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function copyOpener() {
    if (!person.opener) return;
    try {
      await navigator.clipboard.writeText(person.opener);
      setFeedback("copied");
    } catch {
      // The clipboard can be blocked (permissions, or a plain-http demo URL). Select the text so copying still works.
      if (openerText.current) window.getSelection()?.selectAllChildren(openerText.current);
      setFeedback("selected");
    }
  }

  const PrefIcon = person.intro_prefs === "quiet" ? Moon : MessageCircle;

  return (
    <Card>
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-4">
        <Avatar className="size-11">
          <AvatarFallback aria-hidden="true">{initials(person.display_name)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1">
          <h3 className="text-lg leading-tight font-semibold">{person.display_name}</h3>
          <p className="text-sm text-muted-foreground">{subtitle(person.role, person.company_type)}</p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <p className="text-sm">{person.bio}</p>

        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Works with:</span> {person.stack}
          </p>
          {person.interests.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Interests of ${person.display_name}`}>
              {person.interests.map((interest) => (
                <li key={interest}>
                  <Badge variant="secondary">{interest}</Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PrefIcon aria-hidden="true" className="size-4" />
            {introPreferenceLabel(person.intro_prefs)}
          </p>
        </div>

        {person.opener && (
          <figure className="grid gap-3 rounded-xl border bg-muted/40 p-4">
            <figcaption className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Suggested opener</figcaption>
            <blockquote ref={openerText} className="text-sm leading-relaxed">
              {person.opener}
            </blockquote>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={copyOpener}>
                {feedback === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                {feedback === "copied" ? "Copied" : "Copy opener"}
                <span className="sr-only"> for {person.display_name}</span>
              </Button>
              <span role="status" className="ml-3 text-sm text-muted-foreground">
                {feedback === "copied" && `Opener for ${person.display_name} copied.`}
                {feedback === "selected" && "Text selected: press Ctrl+C (Cmd+C on Mac) to copy."}
              </span>
            </div>
          </figure>
        )}
      </CardContent>
    </Card>
  );
}
