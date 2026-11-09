"use client";

import { ContactSearchResponse, type ContactResult } from "@confy/shared/contracts";
import { CircleAlert, LoaderCircle, Search, UsersRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, api } from "@/lib/api/client";
import { ContactCard } from "./ContactCard";

const EXAMPLES = [
  "the person I met at the eBPF talk who worked at a bank",
  "someone from a telco I met at the bare metal talk",
  "who did I meet at the multi-tenancy talk",
];

type Recent = { status: "loading" } | { status: "error" } | { status: "ok"; results: ContactResult[] };
type Search =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; query: string; results: ContactResult[] };

/**
 * Recall people you met by what you remember, plus your most recent contacts. Contacts are private per
 * persona: the page remounts (see the `key` in the route) when the persona changes, so nothing carries over.
 */
export function ContactsFinder({ userId }: { userId: string }) {
  const [recent, setRecent] = useState<Recent>({ status: "loading" });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ phase: "idle" });
  const resultsHeading = useRef<HTMLHeadingElement>(null);

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

  async function find(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length === 0) {
      setSearch({ phase: "error", message: "Describe who you are trying to remember, for example where you met them or what they do." });
      return;
    }
    setSearch({ phase: "loading" });
    try {
      const res = await api.get(`/v1/contacts/search?q=${encodeURIComponent(q)}`, ContactSearchResponse, { userId });
      setSearch({ phase: "done", query: q, results: res.results });
      requestAnimationFrame(() => resultsHeading.current?.focus());
    } catch (err) {
      setSearch({ phase: "error", message: err instanceof ApiRequestError ? err.message : "We could not reach the contacts service. Please try again." });
    }
  }

  const searching = search.phase === "loading";
  const status = searching
    ? "Searching your contacts…"
    : search.phase === "done"
      ? `${search.results.length} ${search.results.length === 1 ? "contact" : "contacts"} found.`
      : "";

  return (
    <div className="grid gap-8">
      <Card>
        <form onSubmit={find} noValidate className="grid gap-6">
          <CardHeader>
            <CardTitle>
              <h2>Who are you trying to remember?</h2>
            </CardTitle>
            <CardDescription>Search only your own contacts by anything you recall: a talk, a company, a topic.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="contacts-query">What do you remember?</Label>
              <Textarea
                id="contacts-query"
                name="q"
                rows={2}
                maxLength={200}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby="contacts-hint"
                aria-invalid={search.phase === "error" ? true : undefined}
                placeholder="e.g. the person I met at the eBPF talk who worked at a bank"
              />
              <p id="contacts-hint" className="text-sm text-muted-foreground">
                Roughly is fine: we match on meaning as well as words.
              </p>
            </div>

            <ExamplePrompts examples={EXAMPLES} onSelect={setQuery} />
          </CardContent>

          <CardFooter>
            <Button type="submit" size="lg" disabled={searching} aria-describedby="contacts-status">
              {searching ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Search aria-hidden="true" />}
              {searching ? "Searching…" : "Find contact"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <p id="contacts-status" role="status" className="sr-only">
        {status}
      </p>

      {search.phase === "error" && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>We couldn&apos;t search your contacts</AlertTitle>
          <AlertDescription>{search.message}</AlertDescription>
        </Alert>
      )}

      {searching && (
        <div aria-hidden="true" className="grid gap-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {search.phase === "done" && (
        <section aria-labelledby="contacts-results-heading" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="contacts-results-heading" ref={resultsHeading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
              {search.results.length === 0 ? "No contact matched" : `${search.results.length} ${search.results.length === 1 ? "contact" : "contacts"} found`}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSearch({ phase: "idle" })}>
              Clear search
            </Button>
          </div>
          {search.results.length === 0 ? (
            <Alert role="status">
              <UsersRound aria-hidden="true" />
              <AlertTitle>Nothing close enough</AlertTitle>
              <AlertDescription>Try fewer details, such as the talk you were at or the kind of company they work for.</AlertDescription>
            </Alert>
          ) : (
            <ul className="grid gap-4">
              {search.results.map((contact) => (
                <li key={contact.id}>
                  <ContactCard contact={contact} userId={userId} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {search.phase !== "done" && (
        <section aria-labelledby="recent-heading" className="grid gap-4">
          <h2 id="recent-heading" className="text-2xl font-semibold tracking-tight">
            Recently met
          </h2>
          {recent.status === "loading" && (
            <div aria-hidden="true" className="grid gap-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}
          {recent.status === "error" && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden="true" />
              <AlertTitle>We couldn&apos;t load your contacts</AlertTitle>
              <AlertDescription>Check that the service is running, then reload the page.</AlertDescription>
            </Alert>
          )}
          {recent.status === "ok" &&
            (recent.results.length === 0 ? (
              <p className="text-muted-foreground">You haven&apos;t saved any contacts yet. People you meet will show up here.</p>
            ) : (
              <ul className="grid gap-4">
                {recent.results.map((contact) => (
                  <li key={contact.id}>
                    <ContactCard contact={contact} userId={userId} />
                  </li>
                ))}
              </ul>
            ))}
        </section>
      )}
    </div>
  );
}
