"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePersona } from "@/lib/persona/PersonaProvider";

/** "Viewing as" selector. Every api call carries the chosen persona as x-user-id. */
export function PersonaSwitcher() {
  const { persona, personas, setPersonaId } = usePersona();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="persona-select" className="hidden text-muted-foreground sm:block">
        Viewing as
      </Label>
      <Select value={persona.id} onValueChange={setPersonaId}>
        <SelectTrigger id="persona-select" className="min-w-40" aria-label="Viewing as">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {personas.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
              <span className="ml-2 text-xs text-muted-foreground">{p.role}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
