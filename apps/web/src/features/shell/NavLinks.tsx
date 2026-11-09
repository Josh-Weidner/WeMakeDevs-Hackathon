"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { NAV_GROUPS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ITEM = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

/** Feature navigation. Marks the current page with aria-current; unbuilt features are visible but not links. */
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Features" className="grid gap-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="grid gap-1">
          <h2 id={`nav-${group.label}`} className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h2>
          <ul aria-labelledby={`nav-${group.label}`} className="grid gap-1">
            {group.items.map(({ href, label, icon: Icon, ready }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  {ready ? (
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(ITEM, active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60")}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      {label}
                    </Link>
                  ) : (
                    <span className={cn(ITEM, "text-muted-foreground")}>
                      <Icon aria-hidden="true" className="size-4" />
                      {label}
                      <Badge variant="secondary" className="ml-auto">
                        Soon
                      </Badge>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
