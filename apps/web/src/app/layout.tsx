import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/features/shell/AppShell";
import { PersonaProvider } from "@/lib/persona/PersonaProvider";
import { RumInit } from "@/lib/telemetry/RumInit";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confy",
  description: "Your all-in-one conference companion: find the right talks, people, and quiet spaces.",
};

// RUM settings and live demand are read at request time (k8s Secret / the api), not baked into the build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  // Public, ingest-only Dash0 token (separate from the backend one). RUM is skipped when unset.
  const rumEndpoint = process.env.DASH0_RUM_ENDPOINT;
  const rumToken = process.env.DASH0_RUM_TOKEN;

  return (
    <html lang="en">
      <body>
        {rumEndpoint && rumToken ? <RumInit endpoint={rumEndpoint} authToken={rumToken} /> : null}
        <PersonaProvider>
          <AppShell>{children}</AppShell>
        </PersonaProvider>
        {/* Polite live region for async announcements (warnings, "clip saved", result counts). */}
        <div id="announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
      </body>
    </html>
  );
}
