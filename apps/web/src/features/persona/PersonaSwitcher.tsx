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
        <SelectTrigger id="persona-select" className="max-w-[60vw] min-w-0 sm:max-w-none sm:min-w-40" aria-label="Viewing as">
          {/* The role is hidden on phones so the header fits. */}
          <SelectValue>
            <span className="truncate">{persona.name}</span>
            <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{persona.role}</span>
          </SelectValue>
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
