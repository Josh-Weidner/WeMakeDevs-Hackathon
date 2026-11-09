import type { Metadata } from "next";
import { firstParam } from "@/lib/ask";
import { PeopleMatcher } from "@/features/people/PeopleMatcher";
import { PageHeader } from "@/features/shell/PageHeader";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  // Opened from the Ask palette with a request: the feature fills it in and runs it.
  const initialQuery = firstParam((await searchParams).q, 200);

  return (
    <>
      <PageHeader
        title="Find people to meet"
        description="Describe who you want to meet in plain language. Each match comes with a suggested opener, so the first hello is easy and low-pressure."
      />
      <PeopleMatcher initialQuery={initialQuery} />
    </>
  );
}
