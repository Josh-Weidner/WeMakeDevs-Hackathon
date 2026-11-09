"use client";

import { ScheduleResponse } from "@confy/shared/contracts";
import { useRef, useState, type FormEvent } from "react";
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

/** The landing experience: describe your day in plain language, get a clash-free schedule. */
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
    <section aria-labelledby="builder-heading" className="card builder">
      <h2 id="builder-heading">Build your schedule</h2>
      <p className="muted">Describe what you want in your own words. We pick talks that never overlap.</p>

      <form onSubmit={build} noValidate>
        <div className="field">
          <label htmlFor="schedule-request">What would you like to see?</label>
          <textarea
            id="schedule-request"
            name="request"
            rows={3}
            maxLength={300}
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            aria-describedby="schedule-hint"
            placeholder="e.g. Beginner talks on multi-tenancy, nothing vendor-pitchy"
          />
          <p id="schedule-hint" className="hint">
            Mention a topic, a level, a day, or how many talks.
          </p>
        </div>

        <fieldset className="examples">
          <legend>Or start from an example</legend>
          <ul>
            {EXAMPLES.map((example) => (
              <li key={example}>
                <button type="button" className="chip" onClick={() => setRequest(example)}>
                  {example}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="field field--check">
          <input
            id="low-stim"
            type="checkbox"
            checked={lowStimulation}
            onChange={(event) => setLowStimulation(event.target.checked)}
            aria-describedby="low-stim-hint"
          />
          <div>
            <label htmlFor="low-stim">Low-stimulation mode</label>
            <p id="low-stim-hint" className="hint">
              Adds breaks, avoids more than two talks in a row, prefers quieter rooms, and points you to the quiet room.
            </p>
          </div>
        </div>

        <button type="submit" className="button" disabled={loading} aria-describedby="build-status">
          {loading ? "Building…" : "Build my schedule"}
        </button>
      </form>

      {/* Announced politely to assistive tech; visible text lives in the results below. */}
      <p id="build-status" role="status" className="visually-hidden">
        {status}
      </p>

      {state.phase === "error" && (
        <p role="alert" className="error-message">
          <span aria-hidden="true">✕ </span>
          {state.message}
        </p>
      )}

      {state.phase === "done" && (
        <div className="results" aria-busy={loading}>
          <h3 ref={resultsHeading} tabIndex={-1} className="results__heading">
            Your schedule{state.schedule.low_stimulation ? " (low-stimulation)" : ""}
          </h3>
          <p className="muted">
            Understood as:{" "}
            {[
              state.schedule.parsed.query ? `topic “${state.schedule.parsed.query}”` : "any topic",
              state.schedule.parsed.level ?? "any level",
              state.schedule.parsed.excludeVendorPitch ? "no vendor pitches" : null,
              state.schedule.parsed.day ? `on ${state.schedule.parsed.day}` : null,
            ]
              .filter(Boolean)
              .join(", ")}
            .
            {state.schedule.interpreted_by === "fallback" && " (Simple matching was used because the assistant was unavailable.)"}
          </p>
          <ScheduleResults schedule={state.schedule} />
        </div>
      )}
    </section>
  );
}
