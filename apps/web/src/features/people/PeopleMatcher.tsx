"use client";

import { PeopleMatchResponse } from "@confy/shared/contracts";
import { CircleAlert, LoaderCircle, Search, UsersRound } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, api } from "@/lib/api/client";
import { usePersona } from "@/lib/persona/PersonaProvider";
import { PersonCard } from "./PersonCard";

const EXAMPLES = [
  "3 people who run Kubernetes in production on bare metal",
  "Someone working on eBPF networking",
  "Security engineers who care about policy and supply chain",
];

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; query: string; response: PeopleMatchResponse };

/** Describe who you'd like to meet; get opted-in attendees with a suggested opener for each. */
export function PeopleMatcher() {
  const { persona } = usePersona();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  async function find(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length === 0) {
      setState({ phase: "error", message: "Describe who you would like to meet, for example a role, a stack, or a topic." });
      return;
    }
    setState({ phase: "loading" });
    try {
      const response = await api.get(`/v1/people/match?q=${encodeURIComponent(q)}`, PeopleMatchResponse, { userId: persona.id });
      setState({ phase: "done", query: q, response });
      requestAnimationFrame(() => resultsHeading.current?.focus());
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof ApiRequestError ? err.message : "We could not reach the matching service. Please try again.",
      });
    }
  }

  const loading = state.phase === "loading";
  const status =
    state.phase === "loading"
      ? "Finding people…"
      : state.phase === "done"
        ? `${state.response.matches.length} ${state.response.matches.length === 1 ? "person" : "people"} found.`
        : "";

  return (
    <div className="grid gap-8">
      <Card>
        <form onSubmit={find} noValidate className="grid gap-6">
          <CardHeader>
            <CardTitle>
              <h2>Who would you like to meet?</h2>
            </CardTitle>
            <CardDescription>Only attendees who have opted in to introductions are ever shown.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="people-query">Describe them</Label>
              <Textarea
                id="people-query"
                name="q"
                rows={2}
                maxLength={200}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby="people-hint"
                aria-invalid={state.phase === "error" ? true : undefined}
                placeholder="e.g. 3 people who run Kubernetes in production on bare metal"
              />
              <p id="people-hint" className="text-sm text-muted-foreground">
                A role, a technology, a topic, or a situation they&apos;re in.
              </p>
            </div>

            <ExamplePrompts examples={EXAMPLES} onSelect={setQuery} />
          </CardContent>

          <CardFooter>
            <Button type="submit" size="lg" disabled={loading} aria-describedby="people-status">
              {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Search aria-hidden="true" />}
              {loading ? "Finding…" : "Find people"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p id="people-status" role="status" className="sr-only">
        {status}
      </p>

      {state.phase === "error" && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>We couldn&apos;t find people</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div aria-hidden="true" className="grid gap-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      )}

      {state.phase === "done" && (
        <section aria-labelledby="people-results-heading" className="grid gap-4">
          <h2 id="people-results-heading" ref={resultsHeading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
            {state.response.matches.length === 0
              ? "No one matched yet"
              : `${state.response.matches.length} ${state.response.matches.length === 1 ? "person" : "people"} you might want to meet`}
          </h2>

          {state.response.matches.length === 0 ? (
            <Alert role="status">
              <UsersRound aria-hidden="true" />
              <AlertTitle>Nothing close enough</AlertTitle>
              <AlertDescription>Try a broader description, such as a technology or a role instead of a long sentence.</AlertDescription>
            </Alert>
          ) : (
            <ul className="grid gap-4">
              {state.response.matches.map((person) => (
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
