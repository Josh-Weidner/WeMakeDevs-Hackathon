"use client";

import { usePersona } from "@/lib/persona/PersonaProvider";

/** "Viewing as" selector in the header. Every api call carries the chosen persona as x-user-id. */
export function PersonaSwitcher() {
  const { persona, personas, setPersonaId } = usePersona();

  return (
    <div className="persona-switcher">
      <label htmlFor="persona-select">Viewing as</label>
      <select id="persona-select" value={persona.id} onChange={(event) => setPersonaId(event.target.value)}>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
