import { DemandResponse } from "@confy/shared/contracts";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api } from "@/lib/api/client";
import { clock, dayLabel } from "@/lib/schedule/format";

async function fetchDemand(): Promise<DemandResponse | null> {
  try {
    return await api.get("/v1/demand", DemandResponse);
  } catch {
    return null;
  }
}

/** Server Component: rooms that live demand says will fill up. The same numbers feed the Dash0 dashboard. */
export async function LikelyFull() {
  const demand = await fetchDemand();
  const full = demand?.talks.filter((t) => t.likely_full) ?? [];

  return (
    <section aria-labelledby="likely-full-heading" className="card">
      <h2 id="likely-full-heading">Likely to fill up</h2>
      {full.length === 0 ? (
        <p className="muted">No sessions are expected to be full right now.</p>
      ) : (
        <ul className="full-list">
          {full.map((t) => (
            <li key={t.talk_id}>
              <p>
                <strong>{t.title}</strong>
                <br />
                <span className="muted">
                  {t.room_name} · {dayLabel(t.start)}, {clock(t.start)} · {t.capacity} seats, about {Math.round(t.forecast)} interested
                </span>
              </p>
              <StatusBadge status="warning" label="Likely full: arrive early or watch the stream" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
