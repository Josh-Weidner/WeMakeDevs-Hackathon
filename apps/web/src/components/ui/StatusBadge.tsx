/**
 * Status indicator that NEVER relies on color alone (CLAUDE.md §7):
 * always renders an icon AND a text label; color is only reinforcement.
 */
export type Status = "ok" | "warning" | "error";

const ICON: Record<Status, string> = { ok: "✓", warning: "!", error: "✕" };

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span aria-hidden="true" className="status-badge__icon">
        {ICON[status]}
      </span>
      <span>{label}</span>
    </span>
  );
}
