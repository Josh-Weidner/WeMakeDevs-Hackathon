import type { Metadata } from "next";
import { firstParam } from "@/lib/ask";
import { ContactsView } from "@/features/contacts/ContactsView";
import { PageHeader } from "@/features/shell/PageHeader";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  // Opened from the Ask palette with a request: the feature fills it in and runs it.
  const initialQuery = firstParam((await searchParams).q, 200);

  return (
    <>
      <PageHeader
        title="Your contacts"
        description="Remember who you met by what you recall, then follow up while it's fresh. Contacts are private to you: each persona sees only their own."
      />
      <ContactsView initialQuery={initialQuery} />
    </>
  );
}
