import { DemandResponse } from "@confy/shared/contracts";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Likely to fill up</h2>
        </CardTitle>
        <CardDescription>Live demand from searches and bookmarks.</CardDescription>
      </CardHeader>
      <CardContent>
        {full.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions are expected to be full right now.</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
