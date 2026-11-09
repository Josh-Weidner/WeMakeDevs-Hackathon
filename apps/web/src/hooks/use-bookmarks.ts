"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { addBookmark, bookmarksKey, parseBookmarks } from "@/lib/bookmarks";

const CHANGE_EVENT = "confy:bookmarks-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Which talks this persona has bookmarked in this browser. Shared across pages and tabs via localStorage. */
export function useBookmarks(personaId: string) {
  const key = bookmarksKey(personaId);
  const read = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const ids = useMemo(() => parseBookmarks(raw), [raw]);

  const add = useCallback(
    (id: string) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(addBookmark(parseBookmarks(window.localStorage.getItem(key)), id)));
      } catch {
        // storage blocked: the bookmark was still recorded by the api
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );

  return { has: (id: string) => ids.includes(id), add };
}
