import { DemandResponse } from "@confy/shared/contracts";
import { CircleCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api/client";
import { clock, dayLabel } from "@/lib/schedule/format";

async function fetchDemand(): Promise<DemandResponse | null> {
  try {
    return await api.get("/v1/demand", DemandResponse);
  } catch {
    return null;
  }
}

/** Server Component: sessions that live demand says will fill up. The same numbers feed the Dash0 dashboard. */
export async function LikelyFull() {
  const demand = await fetchDemand();
  const full = demand?.talks.filter((t) => t.likely_full) ?? [];

  // Nothing to warn about: a single quiet line instead of an empty card, so the rail never wastes space.
  if (full.length === 0) {
    return (
      <section aria-labelledby="likely-full-heading">
        <h2 id="likely-full-heading" className="sr-only">
          Likely to fill up
        </h2>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          No sessions are expected to be full right now.
        </p>
      </section>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Likely to fill up</h2>
        </CardTitle>
        <CardDescription>Live demand from searches and bookmarks.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-4">
            {full.map((t, index) => (
              <li key={t.talk_id} className="grid gap-2">
                {index > 0 && <Separator className="mb-2" />}
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-muted-foreground">
                  {t.room_name} · {dayLabel(t.start)}, {clock(t.start)}
                  <br />
                  {t.capacity} seats, about {Math.round(t.forecast)} interested
                </p>
                <div>
                  <StatusBadge status="warning" label="Likely full: arrive early or watch the stream" />
                </div>
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  );
}
