import { StatusBadge } from "@/components/ui/StatusBadge";
import { CROWD_LABEL, type CrowdLevel } from "@/lib/rooms/crowd";

const STATUS = { quiet: "ok", busy: "warning", full: "warning" } as const;

/** Expected crowd for a session: icon + words, never color alone. */
export function CrowdBadge({ level }: { level: CrowdLevel }) {
  return <StatusBadge status={STATUS[level]} label={CROWD_LABEL[level]} />;
}
