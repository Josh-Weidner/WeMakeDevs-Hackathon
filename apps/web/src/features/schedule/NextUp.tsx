"use client";

import { Accessibility, MapPin } from "lucide-react";
import { TalkLink } from "@/components/TalkLink";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSavedSchedule } from "@/hooks/use-saved-schedule";
import { usePersona } from "@/lib/persona/PersonaProvider";
import { nextUp, startsIn } from "@/lib/saved-schedule";
import { clock, dayLabel } from "@/lib/schedule/format";

/** The next talk on the persona's saved schedule. Renders nothing until there is one. */
export function NextUp() {
  const { persona } = usePersona();
  const { saved } = useSavedSchedule(persona.id);
  if (!saved) return null;

  const now = new Date();
  const next = nextUp(saved.schedule, now);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Next up</h2>
        </CardTitle>
        <CardDescription>{next ? startsIn(next.start, now) : "Your saved schedule is complete."}</CardDescription>
      </CardHeader>
      {next && (
        <CardContent className="grid gap-2 text-sm">
          <p className="font-medium">
            <TalkLink id={next.talk_id}>{next.title}</TalkLink>
          </p>
          <p className="text-muted-foreground">
            {dayLabel(next.start)}, {clock(next.start)}
          </p>
          <p className="flex items-start gap-2">
            <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              {next.room.name}, floor {next.room.floor}
            </span>
          </p>
          <p className="flex items-start gap-2 text-muted-foreground">
            <Accessibility aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{next.room.step_free_route}</span>
          </p>
        </CardContent>
      )}
    </Card>
  );
}
