"use client";

import { usePersona } from "@/lib/persona/PersonaProvider";
import { ContactsFinder } from "./ContactsFinder";

/** Keyed by persona: switching "Viewing as" remounts the finder, so one persona's contacts never linger for another. */
export function ContactsView({ initialQuery }: { initialQuery?: string }) {
  const { persona } = usePersona();
  return <ContactsFinder key={persona.id} userId={persona.id} initialQuery={initialQuery} />;
}
