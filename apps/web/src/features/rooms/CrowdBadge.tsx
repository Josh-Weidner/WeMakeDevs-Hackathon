import { StatusBadge } from "@/components/ui/StatusBadge";
import { CROWD_LABEL, type CrowdLevel } from "@/lib/rooms/crowd";

const STATUS: Record<Exclude<CrowdLevel, "unknown">, "ok" | "warning"> = {
  quiet: "ok",
  busy: "warning",
  full: "warning",
};

/** Expected crowd for a session: icon + words, never color alone. */
export function CrowdBadge({ level }: { level: CrowdLevel }) {
  if (level === "unknown") return null;
  return <StatusBadge status={STATUS[level]} label={CROWD_LABEL[level]} />;
}
