"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY, parsePreference, resolveDark, type ThemePreference } from "./theme";

interface ThemeState {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);
const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}

function readPreference(): ThemePreference {
  try {
    return parsePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

const applyTheme = (preference: ThemePreference) =>
  document.documentElement.classList.toggle("dark", resolveDark(preference, window.matchMedia(DARK_QUERY).matches));

/**
 * Light, dark, or follow the system. The no-flash script in <head> sets the initial class; this keeps it in sync
 * when the user changes the preference or the operating system flips while "System" is selected.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as ThemePreference);

  useEffect(() => {
    applyTheme(preference);
    if (preference !== "system") return;
    const query = window.matchMedia(DARK_QUERY);
    const onSystemChange = () => applyTheme("system");
    query.addEventListener("change", onSystemChange);
    return () => query.removeEventListener("change", onSystemChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage blocked: the choice applies until reload
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
