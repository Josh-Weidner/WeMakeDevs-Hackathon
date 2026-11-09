import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Status indicator that NEVER relies on color alone (CLAUDE.md §7):
 * always renders an icon AND a text label; color is only reinforcement.
 */
export type Status = "ok" | "warning" | "error";

const CONFIG = {
  ok: { icon: CircleCheck, variant: "success" },
  warning: { icon: TriangleAlert, variant: "warning" },
  error: { icon: CircleX, variant: "destructive" },
} as const;

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  const { icon: Icon, variant } = CONFIG[status];
  return (
    <Badge variant={variant} className="h-auto gap-1.5 py-1 text-sm whitespace-normal">
      <Icon aria-hidden="true" className="size-4!" />
      <span>{label}</span>
    </Badge>
  );
}
