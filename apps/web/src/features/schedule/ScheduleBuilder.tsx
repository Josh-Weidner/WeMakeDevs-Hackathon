"use client";

import { ScheduleResponse } from "@confy/shared/contracts";
import { CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, api } from "@/lib/api/client";
import { usePersona } from "@/lib/persona/PersonaProvider";
import { ScheduleResults } from "./ScheduleResults";

const EXAMPLES = [
  "Beginner talks on multi-tenancy, nothing vendor-pitchy",
  "Three advanced talks on observability on day two",
  "Security and networking talks for someone who knows Kubernetes",
];

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "done"; schedule: ScheduleResponse };

/** Describe your day in plain language, get a clash-free schedule. */
export function ScheduleBuilder() {
  const { persona } = usePersona();
  const [request, setRequest] = useState("");
  const [lowStimulation, setLowStimulation] = useState(false);
  const [state, setState] = useState<State>({ phase: "idle" });
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  async function build(event: FormEvent) {
    event.preventDefault();
    if (request.trim().length === 0) {
      setState({ phase: "error", message: "Tell us what you would like to see, for example a topic or a level." });
      return;
    }
    setState({ phase: "loading" });
    try {
      const schedule = await api.post("/v1/schedule/build", ScheduleResponse, { request, lowStimulation }, { userId: persona.id });
      setState({ phase: "done", schedule });
      // Move focus to the results so keyboard and screen-reader users land on them.
      requestAnimationFrame(() => resultsHeading.current?.focus());
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof ApiRequestError ? err.message : "We could not reach the schedule service. Please try again.",
      });
    }
  }

  const loading = state.phase === "loading";
  const status =
    state.phase === "loading"
      ? "Building your schedule…"
      : state.phase === "done"
        ? `Schedule ready: ${state.schedule.items.length} ${state.schedule.items.length === 1 ? "talk" : "talks"}.`
        : "";

  return (
    <div className="grid gap-8">
      <Card>
        <form onSubmit={build} noValidate className="grid gap-6">
          <CardHeader>
            <CardTitle>
              <h2>Describe your day</h2>
            </CardTitle>
            <CardDescription>Use your own words. We only pick talks that never overlap.</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="schedule-request">What would you like to see?</Label>
              <Textarea
                id="schedule-request"
                name="request"
                rows={3}
                maxLength={300}
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                aria-describedby="schedule-hint"
                aria-invalid={state.phase === "error" ? true : undefined}
                placeholder="e.g. Beginner talks on multi-tenancy, nothing vendor-pitchy"
              />
              <p id="schedule-hint" className="text-sm text-muted-foreground">
                Mention a topic, a level, a day, or how many talks.
              </p>
            </div>

            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">Or start from an example</legend>
              <ul className="flex flex-wrap gap-2">
                {EXAMPLES.map((example) => (
                  <li key={example}>
                    <Button type="button" variant="outline" size="sm" className="h-auto rounded-full py-1.5 whitespace-normal" onClick={() => setRequest(example)}>
                      {example}
                    </Button>
                  </li>
                ))}
              </ul>
            </fieldset>

            <div className="flex items-start gap-3 rounded-xl border p-4">
              <Checkbox
                id="low-stim"
                checked={lowStimulation}
                onCheckedChange={(checked) => setLowStimulation(checked === true)}
                aria-describedby="low-stim-hint"
                className="mt-0.5"
              />
              <div className="grid gap-1">
                <Label htmlFor="low-stim">Low-stimulation mode</Label>
                <p id="low-stim-hint" className="text-sm text-muted-foreground">
                  Adds breaks, avoids more than two talks in a row, prefers quieter rooms, and points you to the quiet room.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" size="lg" disabled={loading} aria-describedby="build-status">
              {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Sparkles aria-hidden="true" />}
              {loading ? "Building…" : "Build my schedule"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Announced politely to assistive tech; the visible text lives in the results below. */}
      <p id="build-status" role="status" className="sr-only">
        {status}
      </p>

      {state.phase === "error" && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>We couldn&apos;t build that</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div aria-hidden="true" className="grid gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {state.phase === "done" && (
        <section aria-labelledby="results-heading" className="grid gap-4">
          <div className="grid gap-2">
            <h2 id="results-heading" ref={resultsHeading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
              Your schedule{state.schedule.low_stimulation ? " (low-stimulation)" : ""}
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>Understood as:</span>
              <Badge variant="secondary">{state.schedule.parsed.query ? `topic “${state.schedule.parsed.query}”` : "any topic"}</Badge>
              <Badge variant="secondary">{state.schedule.parsed.level ?? "any level"}</Badge>
              {state.schedule.parsed.excludeVendorPitch && <Badge variant="secondary">no vendor pitches</Badge>}
              {state.schedule.parsed.day && <Badge variant="secondary">on {state.schedule.parsed.day}</Badge>}
            </div>
            {state.schedule.interpreted_by === "fallback" && (
              <p className="text-sm text-muted-foreground">Simple matching was used because the assistant was unavailable.</p>
            )}
          </div>
          <ScheduleResults schedule={state.schedule} />
        </section>
      )}
    </div>
  );
}
