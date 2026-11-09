"use client";

import { DEFAULT_DEMO_USER_ID, DEMO_PERSONAS } from "@confy/shared/contracts";
import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

type Persona = (typeof DEMO_PERSONAS)[number];

interface PersonaState {
  persona: Persona;
  personas: readonly Persona[];
  setPersonaId: (id: string) => void;
}

const STORAGE_KEY = "confy:persona";
const CHANGE_EVENT = "confy:persona-change";
const PersonaContext = createContext<PersonaState | null>(null);

const find = (id: string) => DEMO_PERSONAS.find((p) => p.id === id) ?? (DEMO_PERSONAS[0] as Persona);

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readStored(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_DEMO_USER_ID;
  } catch {
    return DEFAULT_DEMO_USER_ID; // storage unavailable (private mode): the default persona is fine
  }
}

/**
 * The demo persona switcher state (no auth, by decision), remembered per browser.
 * Stored in localStorage and read with useSyncExternalStore, so the server render and first client
 * render agree (default persona) and the saved choice applies right after hydration.
 */
export function PersonaProvider({ children }: { children: ReactNode }) {
  const id = useSyncExternalStore(subscribe, readStored, () => DEFAULT_DEMO_USER_ID);

  const setPersonaId = useCallback((next: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore: the choice just won't persist
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(() => ({ persona: find(id), personas: DEMO_PERSONAS, setPersonaId }), [id, setPersonaId]);
  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaState {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error("usePersona must be used inside <PersonaProvider>");
  return ctx;
}
