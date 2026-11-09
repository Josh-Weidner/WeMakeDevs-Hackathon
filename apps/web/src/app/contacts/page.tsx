import type { Metadata } from "next";
import { ContactsView } from "@/features/contacts/ContactsView";
import { PageHeader } from "@/features/shell/PageHeader";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title="Your contacts"
        description="Remember who you met by what you recall, then follow up while it's fresh. Contacts are private to you: each persona sees only their own."
      />
      <ContactsView />
    </>
  );
}
