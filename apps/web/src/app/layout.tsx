import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PersonaSwitcher } from "../features/persona/PersonaSwitcher";
import { PersonaProvider } from "../lib/persona/PersonaProvider";
import { RumInit } from "../lib/telemetry/RumInit";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confy",
  description: "Your all-in-one conference companion: find the right talks, people, and quiet spaces.",
};

// RUM settings are read at request time (k8s Secret), not baked into the build.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  // Public, ingest-only Dash0 token (separate from the backend one). RUM is skipped when unset.
  const rumEndpoint = process.env.DASH0_RUM_ENDPOINT;
  const rumToken = process.env.DASH0_RUM_TOKEN;

  return (
    <html lang="en">
      <body>
        {rumEndpoint && rumToken ? <RumInit endpoint={rumEndpoint} authToken={rumToken} /> : null}
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <PersonaProvider>
          <header className="site-header">
            <p className="brand">Confy</p>
            <nav aria-label="Primary">
              <ul>
                <li>
                  <Link href="/">Schedule</Link>
                </li>
              </ul>
            </nav>
            <PersonaSwitcher />
          </header>
          <main id="main" tabIndex={-1}>
            {children}
          </main>
        </PersonaProvider>
        {/* Polite live region for async announcements (warnings, "clip saved", result counts). */}
        <div id="announcer" aria-live="polite" aria-atomic="true" className="visually-hidden" />
      </body>
    </html>
  );
}
