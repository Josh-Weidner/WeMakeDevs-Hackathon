"use client";

import { ContactSearchResponse, type ContactResult } from "@confy/shared/contracts";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { AskPanel } from "@/components/AskPanel";
import { EmptyNotice, ErrorNotice, LoadingList, ResultsHeading } from "@/components/ResultStates";
import { Button } from "@/components/ui/button";
import { useAsyncResult } from "@/hooks/use-async-result";
import { api } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { ContactCard } from "./ContactCard";

const EXAMPLES = [
  "the person I met at the eBPF talk who worked at a bank",
  "someone from a telco I met at the bare metal talk",
  "who did I meet at the multi-tenancy talk",
];

type Recent = { status: "loading" } | { status: "error" } | { status: "ok"; results: ContactResult[] };

function ContactList({ contacts, userId }: { contacts: ContactResult[]; userId: string }) {
  return (
    <ul className="grid gap-4">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <ContactCard contact={contact} userId={userId} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Recall people you met by what you remember, plus your most recent contacts. Contacts are private per
 * persona: the page remounts (see the `key` in ContactsView) when the persona changes, so nothing carries over.
 */
export function ContactsFinder({ userId }: { userId: string }) {
  const [recent, setRecent] = useState<Recent>({ status: "loading" });
  const [query, setQuery] = useState("");
  const { state, run, fail, reset, headingRef } = useAsyncResult<ContactResult[]>();

  useEffect(() => {
    let cancelled = false;
    api
      .get("/v1/contacts", ContactSearchResponse, { userId })
      .then((res) => !cancelled && setRecent({ status: "ok", results: res.results }))
      .catch(() => !cancelled && setRecent({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function find() {
    const q = query.trim();
    if (q.length === 0) return fail("Describe who you are trying to remember, for example where you met them or what they do.");
    void run(
      async () => (await api.get(`/v1/contacts/search?q=${encodeURIComponent(q)}`, ContactSearchResponse, { userId })).results,
      "We could not reach the contacts service. Please try again.",
    );
  }

  const results = state.phase === "done" ? state.data : [];
  const status = state.phase === "loading" ? "Searching your contacts…" : state.phase === "done" ? `${plural(results.length, "contact", "contacts")} found.` : "";

  return (
    <div className="grid gap-8">
      <AskPanel
        id="contacts"
        title="Who are you trying to remember?"
        description="Search only your own contacts by anything you recall: a talk, a company, a topic."
        label="What do you remember?"
        hint="Roughly is fine: we match on meaning as well as words."
        placeholder="e.g. the person I met at the eBPF talk who worked at a bank"
        maxLength={200}
        value={query}
        onChange={setQuery}
        onSubmit={find}
        examples={EXAMPLES}
        submitLabel="Find contact"
        busyLabel="Searching…"
        icon={Search}
        busy={state.phase === "loading"}
        invalid={state.phase === "error"}
        status={status}
      />

      {state.phase === "error" && <ErrorNotice title="We couldn't search your contacts" message={state.message} />}
      {state.phase === "loading" && <LoadingList rows={1} rowClass="h-48" />}

      {state.phase === "done" && (
        <section aria-labelledby="contacts-results-heading" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ResultsHeading id="contacts-results-heading" ref={headingRef}>
              {results.length === 0 ? "No contact matched" : `${plural(results.length, "contact", "contacts")} found`}
            </ResultsHeading>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Clear search
            </Button>
          </div>
          {results.length === 0 ? (
            <EmptyNotice title="Nothing close enough">Try fewer details, such as the talk you were at or the kind of company they work for.</EmptyNotice>
          ) : (
            <ContactList contacts={results} userId={userId} />
          )}
        </section>
      )}

      {state.phase !== "done" && (
        <section aria-labelledby="recent-heading" className="grid gap-4">
          <h2 id="recent-heading" className="text-2xl font-semibold tracking-tight">
            Recently met
          </h2>
          {recent.status === "loading" && <LoadingList rows={2} rowClass="h-48" />}
          {recent.status === "error" && <ErrorNotice title="We couldn't load your contacts" message="Check that the service is running, then reload the page." />}
          {recent.status === "ok" &&
            (recent.results.length === 0 ? (
              <p className="text-muted-foreground">You haven&apos;t saved any contacts yet. People you meet will show up here.</p>
            ) : (
              <ContactList contacts={recent.results} userId={userId} />
            ))}
        </section>
      )}
    </div>
  );
}
