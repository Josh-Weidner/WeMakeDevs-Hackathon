import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confy",
  description: "Your all-in-one conference companion: find the right talks, people, and quiet spaces.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <p className="brand">Confy</p>
          <nav aria-label="Primary">
            <ul>
              <li>
                <Link href="/">Home</Link>
              </li>
            </ul>
          </nav>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        {/* Polite live region for async announcements (warnings, "clip saved", result counts). */}
        <div id="announcer" aria-live="polite" aria-atomic="true" className="visually-hidden" />
      </body>
    </html>
  );
}
