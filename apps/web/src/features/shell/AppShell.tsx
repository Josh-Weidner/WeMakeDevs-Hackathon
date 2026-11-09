import { CalendarCheck2 } from "lucide-react";
import type { ReactNode } from "react";
import { LikelyFull } from "@/features/rooms/LikelyFull";
import { PersonaSwitcher } from "@/features/persona/PersonaSwitcher";
import { SystemStatus } from "@/features/system-status/SystemStatus";
import { MobileNav } from "./MobileNav";
import { NavLinks } from "./NavLinks";

function Brand() {
  return (
    <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
      <CalendarCheck2 aria-hidden="true" className="size-5 text-primary" />
      Confy
    </p>
  );
}

/**
 * The persistent frame around every feature: sidebar nav (a sheet on small screens), the persona switcher,
 * and a live "likely to fill up" rail. Features render only their own content into `children`.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg border bg-background px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-6 md:p-4">
        <div className="px-3 pt-1">
          <Brand />
        </div>
        <NavLinks />
        <div className="mt-auto px-3">
          <SystemStatus />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <MobileNav />
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="ml-auto">
            <PersonaSwitcher />
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-6xl gap-8 p-4 md:p-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <main id="main" tabIndex={-1} className="min-w-0 outline-none">
            {children}
          </main>
          <aside aria-label="Live room demand" className="xl:sticky xl:top-24 xl:self-start">
            <LikelyFull />
          </aside>
        </div>
      </div>
    </div>
  );
}
