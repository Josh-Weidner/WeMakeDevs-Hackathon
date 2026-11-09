"use client";

import type { ScheduleResponse } from "@confy/shared/contracts";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseSavedSchedule, savedScheduleKey } from "@/lib/saved-schedule";

const CHANGE_EVENT = "confy:schedule-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** The persona's saved schedule (null on the server and until hydrated), plus save and clear. Shared across pages. */
export function useSavedSchedule(personaId: string) {
  const key = savedScheduleKey(personaId);
  const read = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const saved = useMemo(() => parseSavedSchedule(raw), [raw]);

  const save = useCallback(
    (request: string, schedule: ScheduleResponse) => {
      try {
        window.localStorage.setItem(key, JSON.stringify({ request, saved_at: new Date().toISOString(), schedule }));
      } catch {
        // storage blocked or full: the schedule still shows for this visit
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [key]);

  return { saved, save, clear };
}
