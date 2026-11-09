"use client";

import { ContactFollowUpResponse, type ContactResult } from "@confy/shared/contracts";
import { CalendarClock, CircleAlert, LoaderCircle, PenLine } from "lucide-react";
import { useState } from "react";
import { TalkLink } from "@/components/TalkLink";
import { DraftNote } from "@/components/DraftNote";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ApiRequestError, api } from "@/lib/api/client";
import { contactSubtitle, metAt } from "@/lib/contacts/format";
import { initials } from "@/lib/people/format";

type Draft = { phase: "idle" } | { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; text: string };

/** One saved contact: who, where you met, your notes, and an on-demand follow-up note. */
export function ContactCard({ contact, userId }: { contact: ContactResult; userId: string }) {
  const [draft, setDraft] = useState<Draft>({ phase: "idle" });

  async function writeFollowUp() {
    setDraft({ phase: "loading" });
    try {
      const res = await api.post(`/v1/contacts/${encodeURIComponent(contact.id)}/follow-up`, ContactFollowUpResponse, undefined, { userId });
      setDraft({ phase: "ready", text: res.draft });
    } catch (err) {
      setDraft({ phase: "error", message: err instanceof ApiRequestError ? err.message : "We couldn't reach the service. Please try again." });
    }
  }

  return (
    <Card>
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-4">
        <Avatar className="size-11">
          <AvatarFallback aria-hidden="true">{initials(contact.contact_name)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1">
          <h3 className="text-lg leading-tight font-semibold">{contact.contact_name}</h3>
          <p className="text-sm text-muted-foreground">{contactSubtitle(contact.role, contact.company)}</p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{contact.company_type}</Badge>
        </div>

        <p className="flex items-start gap-2 text-sm">
          <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            {contact.met_at_talk_title ? (
              <>
                Met at{" "}
                {contact.met_at_talk_id ? (
                  <strong>
                    <TalkLink id={contact.met_at_talk_id}>{contact.met_at_talk_title}</TalkLink>
                  </strong>
                ) : (
                  <strong>{contact.met_at_talk_title}</strong>
                )}
              </>
            ) : (
              "Met"
            )}
            <span className="text-muted-foreground"> · {metAt(contact.met_at_time)}</span>
          </span>
        </p>

        <p className="text-sm">
          <span className="font-medium">Your notes:</span> {contact.notes}
        </p>

        {draft.phase === "ready" ? (
          <DraftNote label="Follow-up note" text={draft.text} name={contact.contact_name} linkedinUrl={contact.linkedin_url} />
        ) : (
          <div className="grid gap-3">
            <div>
              <Button type="button" variant="outline" size="sm" onClick={writeFollowUp} disabled={draft.phase === "loading"}>
                {draft.phase === "loading" ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <PenLine aria-hidden="true" />}
                {draft.phase === "loading" ? "Writing…" : "Draft a follow-up note"}
                <span className="sr-only"> for {contact.contact_name}</span>
              </Button>
            </div>
            {draft.phase === "error" && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertDescription>{draft.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
