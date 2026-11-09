"use client";

import { PeopleMatchResponse } from "@confy/shared/contracts";
import { Search } from "lucide-react";
import { useState } from "react";
import { AskPanel } from "@/components/AskPanel";
import { EmptyNotice, ErrorNotice, LoadingList, ResultsHeading } from "@/components/ResultStates";
import { useAsyncResult } from "@/hooks/use-async-result";
import { useAutoSubmit } from "@/hooks/use-auto-submit";
import { api } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { usePersona } from "@/lib/persona/PersonaProvider";
import { PersonCard } from "./PersonCard";

const EXAMPLES = [
  "3 people who run Kubernetes in production on bare metal",
  "Someone working on eBPF networking",
  "Security engineers who care about policy and supply chain",
];

/** Describe who you'd like to meet; get opted-in attendees with a suggested opener for each. */
export function PeopleMatcher({ initialQuery }: { initialQuery?: string }) {
  const { persona } = usePersona();
  const [query, setQuery] = useState(initialQuery ?? "");
  const { state, run, fail, headingRef } = useAsyncResult<PeopleMatchResponse>();

  function find() {
    const q = query.trim();
    if (q.length === 0) return fail("Describe who you would like to meet, for example a role, a stack, or a topic.");
    void run(() => api.get(`/v1/people/match?q=${encodeURIComponent(q)}`, PeopleMatchResponse, { userId: persona.id }), "We could not reach the matching service. Please try again.");
  }

  useAutoSubmit(initialQuery, find);

  const matches = state.phase === "done" ? state.data.matches : [];
  const status = state.phase === "loading" ? "Finding people…" : state.phase === "done" ? `${plural(matches.length, "person", "people")} found.` : "";

  return (
    <div className="grid gap-8">
      <AskPanel
        id="people"
        title="Who would you like to meet?"
        description="Only attendees who have opted in to introductions are ever shown."
        label="Describe them"
        hint="A role, a technology, a topic, or a situation they're in."
        placeholder="e.g. 3 people who run Kubernetes in production on bare metal"
        maxLength={200}
        value={query}
        onChange={setQuery}
        onSubmit={find}
        examples={EXAMPLES}
        submitLabel="Find people"
        busyLabel="Finding…"
        icon={Search}
        busy={state.phase === "loading"}
        invalid={state.phase === "error"}
        status={status}
      />

      {state.phase === "error" && <ErrorNotice title="We couldn't find people" message={state.message} />}
      {state.phase === "loading" && <LoadingList rowClass="h-56" />}

      {state.phase === "done" && (
        <section aria-labelledby="people-results-heading" className="grid gap-4">
          <ResultsHeading id="people-results-heading" ref={headingRef}>
            {matches.length === 0 ? "No one matched yet" : `${plural(matches.length, "person", "people")} you might want to meet`}
          </ResultsHeading>
          {matches.length === 0 ? (
            <EmptyNotice title="Nothing close enough">Try a broader description, such as a technology or a role instead of a long sentence.</EmptyNotice>
          ) : (
            <ul className="grid gap-4">
              {matches.map((person) => (
                <li key={person.id}>
                  <PersonCard person={person} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
