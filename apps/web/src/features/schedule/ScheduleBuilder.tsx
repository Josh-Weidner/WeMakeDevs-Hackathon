"use client";

import { ScheduleResponse } from "@confy/shared/contracts";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AskPanel } from "@/components/AskPanel";
import { ErrorNotice, LoadingList, ResultsHeading } from "@/components/ResultStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAsyncResult } from "@/hooks/use-async-result";
import { useAutoSubmit } from "@/hooks/use-auto-submit";
import { useSavedSchedule } from "@/hooks/use-saved-schedule";
import { api } from "@/lib/api/client";
import { plural } from "@/lib/format";
import { usePersona } from "@/lib/persona/PersonaProvider";
import { ScheduleResults } from "./ScheduleResults";

const EXAMPLES = [
  "Beginner talks on multi-tenancy, nothing vendor-pitchy",
  "Three advanced talks on observability on day two",
  "Security and networking talks for someone who knows Kubernetes",
];

/** Describe your day in plain language, get a clash-free schedule. */
export function ScheduleBuilder({ initialQuery }: { initialQuery?: string }) {
  const { persona } = usePersona();
  const [request, setRequest] = useState(initialQuery ?? "");
  const [lowStimulation, setLowStimulation] = useState(false);
  const { state, run, fail, headingRef } = useAsyncResult<ScheduleResponse>();
  const { saved, save, clear } = useSavedSchedule(persona.id);

  function build() {
    if (request.trim().length === 0) return fail("Tell us what you would like to see, for example a topic or a level.");
    void run(async () => {
      const built = await api.post("/v1/schedule/build", ScheduleResponse, { request, lowStimulation }, { userId: persona.id });
      save(request.trim(), built); // keep "my day" across pages and visits
      return built;
    }, "We could not reach the schedule service. Please try again.");
  }

  useAutoSubmit(initialQuery, build);

  // A fresh build wins; otherwise show what this persona saved earlier.
  const fresh = state.phase === "done" ? state.data : null;
  const schedule = fresh ?? saved?.schedule ?? null;
  const showingSaved = !fresh && saved !== null;
  const status = state.phase === "loading" ? "Building your schedule…" : schedule ? `Schedule ready: ${plural(schedule.items.length, "talk", "talks")}.` : "";

  return (
    <div className="grid gap-8">
      <AskPanel
        id="schedule"
        title="Describe your day"
        description="Use your own words. We only pick talks that never overlap."
        label="What would you like to see?"
        hint="Mention a topic, a level, a day, or how many talks."
        placeholder="e.g. Beginner talks on multi-tenancy, nothing vendor-pitchy"
        maxLength={300}
        rows={3}
        value={request}
        onChange={setRequest}
        onSubmit={build}
        examples={EXAMPLES}
        submitLabel="Build my schedule"
        busyLabel="Building…"
        icon={Sparkles}
        busy={state.phase === "loading"}
        invalid={state.phase === "error"}
        status={status}
      >
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
      </AskPanel>

      {state.phase === "error" && <ErrorNotice title="We couldn't build that" message={state.message} />}
      {state.phase === "loading" && <LoadingList rows={2} rowClass="h-28" />}

      {schedule && (
        <section aria-labelledby="results-heading" className="grid gap-4">
          <div className="grid gap-2">
            <ResultsHeading id="results-heading" ref={headingRef}>
              {showingSaved ? "Your saved schedule" : "Your schedule"}
              {schedule.low_stimulation ? " (low-stimulation)" : ""}
            </ResultsHeading>
            {showingSaved && saved && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>
                  From “{saved.request}”, saved {new Date(saved.saved_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={clear}>
                  Clear saved schedule
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>Understood as:</span>
              <Badge variant="secondary">{schedule.parsed.query ? `topic “${schedule.parsed.query}”` : "any topic"}</Badge>
              <Badge variant="secondary">{schedule.parsed.level ?? "any level"}</Badge>
              {schedule.parsed.excludeVendorPitch && <Badge variant="secondary">no vendor pitches</Badge>}
              {schedule.parsed.day && <Badge variant="secondary">on {schedule.parsed.day}</Badge>}
            </div>
            {schedule.interpreted_by === "fallback" && (
              <p className="text-sm text-muted-foreground">Simple matching was used because the assistant was unavailable.</p>
            )}
          </div>
          <ScheduleResults schedule={schedule} />
        </section>
      )}
    </div>
  );
}
