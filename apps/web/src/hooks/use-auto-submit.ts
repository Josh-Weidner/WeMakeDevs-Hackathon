"use client";

import { useEffect, useRef } from "react";
import { useHydrated } from "./use-hydrated";

/**
 * Runs a page's own submit once on arrival when it was opened with a request (`?q=…`, e.g. from the Ask palette).
 * Waits for hydration so the right persona is in place, and never runs twice.
 */
export function useAutoSubmit(initialQuery: string | undefined, submit: () => void) {
  const hydrated = useHydrated();
  const latest = useRef(submit);
  const started = useRef(false);

  useEffect(() => {
    latest.current = submit;
  });

  useEffect(() => {
    if (!hydrated || !initialQuery || started.current) return;
    started.current = true;
    latest.current();
  }, [hydrated, initialQuery]);
}
