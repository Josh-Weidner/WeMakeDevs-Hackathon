import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/features/shell/AppShell";
import { PersonaProvider } from "@/lib/persona/PersonaProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { RumInit } from "@/lib/telemetry/RumInit";
import "./globals.css";

export const metadata: Metadata = {
  // Each page sets its own `title`; the template makes tabs, history and screen-reader page names distinct.
  title: { default: "Confy", template: "%s · Confy" },
  description: "Your all-in-one conference companion: find the right talks, people, and quiet spaces.",
};

// RUM settings and live demand are read at request time (k8s Secret / the api), not baked into the build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  // Public, ingest-only Dash0 token (separate from the backend one). RUM is skipped when unset.
  const rumEndpoint = process.env.DASH0_RUM_ENDPOINT;
  const rumToken = process.env.DASH0_RUM_TOKEN;

  return (
    // suppressHydrationWarning: the init script may add the `dark` class before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {rumEndpoint && rumToken ? <RumInit endpoint={rumEndpoint} authToken={rumToken} /> : null}
        <ThemeProvider>
          <PersonaProvider>
            <AppShell>{children}</AppShell>
          </PersonaProvider>
        </ThemeProvider>
        {/* Polite live region for async announcements (warnings, "clip saved", result counts). */}
        <div id="announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      </body>
    </html>
  );
}
