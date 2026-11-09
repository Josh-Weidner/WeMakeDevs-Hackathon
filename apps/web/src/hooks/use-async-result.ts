"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/api/client";

export type AsyncState<T> = { phase: "idle" } | { phase: "loading" } | { phase: "error"; message: string } | { phase: "done"; data: T };

/**
 * The one way a feature runs a user-initiated request, so every page behaves the same: loading, then either
 * results (focus moves to the results heading, for keyboard and screen-reader users) or a readable error.
 */
export function useAsyncResult<T>() {
  const [state, setState] = useState<AsyncState<T>>({ phase: "idle" });
  /** Attach to the results <h2> (see ResultsHeading). */
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus can only move once the results (and their heading) are in the DOM, so do it after the commit, not
  // from the request callback. Each completed run is a new state object, so repeat searches re-focus too.
  useEffect(() => {
    if (state.phase === "done") headingRef.current?.focus();
  }, [state]);

  const run = useCallback(async (task: () => Promise<T>, fallbackError: string) => {
    setState({ phase: "loading" });
    try {
      const data = await task();
      setState({ phase: "done", data });
    } catch (err) {
      setState({ phase: "error", message: errorMessage(err, fallbackError) });
    }
  }, []);

  /** For validation problems caught before any request is made. */
  const fail = useCallback((message: string) => setState({ phase: "error", message }), []);
  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, run, fail, reset, headingRef };
}
