import { ReadinessResponse } from "@confy/shared/contracts";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiBaseUrl } from "@/lib/api/config";

async function fetchReadiness(): Promise<ReadinessResponse | null> {
  try {
    // /readyz returns 503 with a valid body when a dependency is down, so parse regardless of status.
    const res = await fetch(`${apiBaseUrl()}/readyz`, { cache: "no-store" });
    return ReadinessResponse.parse(await res.json());
  } catch {
    return null;
  }
}

/** Server Component: whether the api and its dependencies are reachable. Sits at the foot of the sidebar. */
export async function SystemStatus() {
  const readiness = await fetchReadiness();

  return (
    <section aria-labelledby="system-status-heading">
      <h2 id="system-status-heading" className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        System status
      </h2>
      <ul className="grid gap-1.5">
        <li>
          <StatusBadge status={readiness ? "ok" : "error"} label={readiness ? "API reachable" : "API unreachable"} />
        </li>
        {readiness &&
          Object.entries(readiness.dependencies).map(([name, status]) => (
            <li key={name}>
              <StatusBadge status={status === "ok" ? "ok" : "error"} label={`${name} ${status === "ok" ? "ok" : "down"}`} />
            </li>
          ))}
      </ul>
    </section>
  );
}
