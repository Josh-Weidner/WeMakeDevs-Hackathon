"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { railFor } from "@/lib/rail";
import { cn } from "@/lib/utils";

/**
 * The page column plus, when the page wants them, a side rail. The panels are rendered on the server (they fetch
 * live data) and passed in; this component only decides which to show for the current route.
 */
export function ShellBody({ children, panels }: { children: ReactNode; panels: Record<"next-up" | "demand", ReactNode> }) {
  const pathname = usePathname();
  const shown = railFor(pathname);

  return (
    <div className={cn("mx-auto grid w-full gap-8 p-4 md:p-8", shown.length > 0 ? "max-w-6xl xl:grid-cols-[minmax(0,1fr)_20rem]" : "max-w-4xl")}>
      <main id="main" tabIndex={-1} className="min-w-0 outline-none">
        {children}
      </main>
      {shown.length > 0 && (
        <aside aria-label="Live information" className="grid content-start gap-4 xl:sticky xl:top-24 xl:self-start">
          {shown.map((panel) => (
            <div key={panel}>{panels[panel]}</div>
          ))}
        </aside>
      )}
    </div>
  );
}
