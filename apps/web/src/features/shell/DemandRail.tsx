"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isActive } from "@/lib/nav";

/** Pages whose phone layout is deliberately bare (Clip: just the QR and two buttons). */
const PHONE_MINIMAL = ["/clip"];

/** The "likely to fill up" rail, except on phones for pages that keep their phone UI minimal. */
export function DemandRail({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const minimal = PHONE_MINIMAL.some((href) => isActive(pathname, href));
  return (
    <aside aria-label="Live room demand" className={`xl:sticky xl:top-24 xl:self-start ${minimal ? "hidden md:block" : ""}`}>
      {children}
    </aside>
  );
}
