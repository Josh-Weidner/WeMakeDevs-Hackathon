"use client";

import { usePersona } from "@/lib/persona/PersonaProvider";
import { ContactsFinder } from "./ContactsFinder";

/** Keyed by persona and request: switching personas or incoming requests remounts the finder. */
export function ContactsView({ initialQuery }: { initialQuery?: string }) {
  const { persona } = usePersona();
  return <ContactsFinder key={`${persona.id}:${initialQuery ?? ""}`} userId={persona.id} initialQuery={initialQuery} />;
}
