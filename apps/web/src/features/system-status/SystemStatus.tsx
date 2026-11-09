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

/** Server Component: shows whether the api and its dependencies are reachable. */
export async function SystemStatus() {
  const readiness = await fetchReadiness();

  return (
    <section aria-labelledby="system-status-heading" className="card">
      <h2 id="system-status-heading">System status</h2>
      <ul className="status-list">
        <li>
          API:{" "}
          {readiness ? (
            <StatusBadge status="ok" label="reachable" />
          ) : (
            <StatusBadge status="error" label="unreachable" />
          )}
        </li>
        {readiness &&
          Object.entries(readiness.dependencies).map(([name, status]) => (
            <li key={name}>
              {name}:{" "}
              <StatusBadge status={status === "ok" ? "ok" : "error"} label={status === "ok" ? "ok" : "down"} />
            </li>
          ))}
      </ul>
    </section>
  );
}
